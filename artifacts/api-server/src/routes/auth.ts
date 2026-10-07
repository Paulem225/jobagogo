import { Router, type IRouter } from "express";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { createHmac, randomBytes, randomInt } from "node:crypto";
import {
  authOtpChallengesTable,
  authSessionsTable,
  db,
  profilesTable,
} from "@workspace/db";
import { sendLoginCode } from "../lib/email";
import { hashToken, requireAuth } from "../middleware/auth";
import { createPremiumTrial } from "../lib/premiumTrial";
import { AUTH_SESSION_TTL_MS } from "../lib/sessionPolicy";
import { acceptsReviewOtp, isConfiguredReviewEmail, reviewOtpConfig } from "../lib/reviewOtp";

const router: IRouter = Router();
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function normalizedEmail(body: unknown): string | null {
  const email = typeof body === "object" && body !== null && "email" in body
    ? (body as { email?: unknown }).email
    : null;
  if (typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function codeHash(email: string, code: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET est requis pour l'authentification.");
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

function authJson(
  profile: typeof profilesTable.$inferSelect,
  accessToken?: string,
  isDemo = false,
) {
  return {
    accessToken,
    user: {
      id: profile.id,
      email: profile.email,
      emailVerifiedAt: profile.emailVerifiedAt?.toISOString() ?? null,
      hasProfile: Boolean(profile.name && profile.name !== "Nouveau candidat"),
      isDemo,
    },
  };
}

router.post("/auth/request-code", async (req, res): Promise<void> => {
  const email = normalizedEmail(req.body);
  if (!email) {
    res.status(400).json({ error: "Saisis une adresse email valide.", code: "INVALID_EMAIL" });
    return;
  }

  const now = new Date();
  if (isConfiguredReviewEmail(email, reviewOtpConfig())) {
    // The disclosed review credential changes only the login step. Do not send
    // mail or create a demo session, profile, feature flag, or Premium override.
    res.json({
      sent: true,
      expiresAt: new Date(now.getTime() + CODE_TTL_MS).toISOString(),
      retryAfterSeconds: 60,
    });
    return;
  }

  const [recent] = await db
    .select({ createdAt: authOtpChallengesTable.createdAt })
    .from(authOtpChallengesTable)
    .where(
      and(
        eq(authOtpChallengesTable.email, email),
        gt(authOtpChallengesTable.createdAt, new Date(Date.now() - RESEND_COOLDOWN_MS)),
      ),
    )
    .orderBy(desc(authOtpChallengesTable.createdAt))
    .limit(1);

  if (recent) {
    res.status(429).json({
      error: "Un nouveau code pourra être demandé dans quelques secondes.",
      code: "OTP_COOLDOWN",
    });
    return;
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);
  await db.insert(authOtpChallengesTable).values({
    email,
    codeHash: codeHash(email, code),
    expiresAt,
  });

  try {
    await sendLoginCode(email, code);
  } catch (error) {
    req.log.error({ err: error }, "OTP email delivery failed");
    res.status(502).json({
      error: "Le code n'a pas pu être envoyé. Vérifie l'adresse puis réessaie.",
      code: "OTP_DELIVERY_FAILED",
    });
    return;
  }

  res.json({ sent: true, expiresAt: expiresAt.toISOString(), retryAfterSeconds: 60 });
});

router.post("/auth/verify-code", async (req, res): Promise<void> => {
  const email = normalizedEmail(req.body);
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!email || !/^\d{6}$/.test(code)) {
    res.status(400).json({ error: "Adresse email ou code invalide.", code: "INVALID_OTP" });
    return;
  }

  if (!acceptsReviewOtp(email, code, reviewOtpConfig())) {
    const [challenge] = await db
      .select()
      .from(authOtpChallengesTable)
      .where(
        and(
          eq(authOtpChallengesTable.email, email),
          isNull(authOtpChallengesTable.consumedAt),
          gt(authOtpChallengesTable.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(authOtpChallengesTable.createdAt))
      .limit(1);

    if (!challenge || challenge.attempts >= MAX_ATTEMPTS) {
      res.status(401).json({ error: "Code invalide ou expiré.", code: "INVALID_OTP" });
      return;
    }

    const valid = challenge.codeHash === codeHash(email, code);
    if (!valid) {
      await db.update(authOtpChallengesTable)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(authOtpChallengesTable.id, challenge.id));
      res.status(401).json({
        error: challenge.attempts + 1 >= MAX_ATTEMPTS
          ? "Trop de tentatives. Demande un nouveau code."
          : "Code invalide ou expiré.",
        code: "INVALID_OTP",
      });
      return;
    }

    await db.update(authOtpChallengesTable)
      .set({ consumedAt: new Date() })
      .where(eq(authOtpChallengesTable.id, challenge.id));
  }

  // Both authentication methods use exactly the same profile and session path.
  let [profile] = await db.select().from(profilesTable)
    .where(eq(profilesTable.email, email))
    .limit(1);

  if (!profile) {
    const premiumTrial = createPremiumTrial();
    [profile] = await db.insert(profilesTable).values({
      name: "Nouveau candidat",
      email,
      emailVerifiedAt: new Date(),
      ...premiumTrial,
    }).returning();
  } else if (!profile.emailVerifiedAt) {
    [profile] = await db.update(profilesTable)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(profilesTable.id, profile.id))
      .returning();
  }

  const rawToken = randomBytes(32).toString("hex");
  await db.insert(authSessionsTable).values({
    profileId: profile.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + AUTH_SESSION_TTL_MS),
  });

  res.json(authJson(profile, rawToken));
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [profile] = await db.select().from(profilesTable)
    .where(eq(profilesTable.id, req.auth!.profileId))
    .limit(1);
  if (!profile) {
    res.status(401).json({ error: "Session invalide.", code: "AUTH_REQUIRED" });
    return;
  }
  res.json(authJson(profile, undefined, req.auth!.isDemo).user);
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  await db.update(authSessionsTable)
    .set({ revokedAt: new Date() })
    .where(eq(authSessionsTable.id, req.auth!.sessionId));
  res.status(204).end();
});

export default router;