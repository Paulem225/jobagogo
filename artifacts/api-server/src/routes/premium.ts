import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, premiumPaymentsTable, profilesTable } from "@workspace/db";
import { requireAuth, requireNonDemo } from "../middleware/auth";

const router: IRouter = Router();
router.use("/premium", requireAuth);

const PLANS = {
  monthly: { amount: 1000, durationDays: 30 },
  annual: { amount: 6000, durationDays: 365 },
} as const;

type Plan = keyof typeof PLANS;

function isPlan(value: unknown): value is Plan {
  return value === "monthly" || value === "annual";
}

export function hub2Headers(): Record<string, string> {
  const environment = process.env["HUB2_ENVIRONMENT"];
  if (environment !== "live" && environment !== "sandbox") {
    throw new Error('HUB2_ENVIRONMENT must be explicitly set to "live" or "sandbox"');
  }

  // Live and sandbox credentials are kept in separate secrets so sandbox keys
  // can never be used against the live environment (and vice versa).
  const apiKey =
    environment === "live" ? process.env["HUB2_LIVE_API_KEY"] : process.env["HUB2_API_KEY"];
  const merchantId =
    environment === "live" ? process.env["HUB2_LIVE_MERCHANT_ID"] : process.env["HUB2_MERCHANT_ID"];
  if (!apiKey || !merchantId) {
    throw new Error(
      environment === "live"
        ? "HUB2_LIVE_API_KEY and HUB2_LIVE_MERCHANT_ID are required in live mode"
        : "HUB2_API_KEY and HUB2_MERCHANT_ID are required in sandbox mode",
    );
  }

  return {
    ApiKey: apiKey,
    MerchantId: merchantId,
    Environment: environment,
    "Content-Type": "application/json",
  };
}

export function hub2Environment(): "sandbox" | "live" {
  return process.env["HUB2_ENVIRONMENT"] === "live" ? "live" : "sandbox";
}

function makePurchaseReference(profileId: number): string {
  return `JOBMATCH_PREMIUM_${profileId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const FAILED_ATTEMPT_STATUSES = ["failed", "failure", "declined", "cancelled", "canceled", "expired"];

const FAILURE_REASON_LABELS: Record<string, string> = {
  "insufficient-funds": "Solde insuffisant sur le compte Mobile Money.",
  insufficient_funds: "Solde insuffisant sur le compte Mobile Money.",
  "authentication-failed": "Authentification échouée (code PIN incorrect ou non saisi).",
  authentication_failed: "Authentification échouée (code PIN incorrect ou non saisi).",
  "wrong-pin": "Code PIN Mobile Money incorrect.",
  wrong_pin: "Code PIN Mobile Money incorrect.",
  "payer-not-found": "Numéro Mobile Money introuvable chez l’opérateur.",
  payer_not_found: "Numéro Mobile Money introuvable chez l’opérateur.",
  "transaction-cancelled": "Paiement annulé.",
  cancelled: "Paiement annulé.",
  canceled: "Paiement annulé.",
  declined: "Paiement refusé par l’opérateur.",
  timeout: "Délai de confirmation dépassé chez l’opérateur.",
  "timed-out": "Délai de confirmation dépassé chez l’opérateur.",
  expired: "La demande de paiement a expiré.",
};

export function failureReasonLabel(rawReason: string | null): string {
  if (!rawReason) return "Le paiement Mobile Money a échoué.";
  const normalized = rawReason.toLowerCase().trim();
  if (FAILURE_REASON_LABELS[normalized]) return FAILURE_REASON_LABELS[normalized];
  const partial = Object.keys(FAILURE_REASON_LABELS).find((key) => normalized.includes(key));
  if (partial) return FAILURE_REASON_LABELS[partial]!;
  return `Le paiement Mobile Money a échoué (${rawReason}).`;
}

function extractAttemptFailureReason(attempt: any): string | null {
  const candidates = [
    attempt?.failure?.code,
    attempt?.failure?.message,
    attempt?.failedReason,
    attempt?.failureReason,
    attempt?.statusMessage,
    attempt?.reason,
    attempt?.providerMessage,
    attempt?.message,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

export function paymentStatusFromHub2(paymentLink: any): { status: string; failureReason: string | null } {
  const attempts = Array.isArray(paymentLink?.paymentAttempts)
    ? paymentLink.paymentAttempts
    : Array.isArray(paymentLink?.attempts)
      ? paymentLink.attempts
      : [];
  const successfulAttempt = attempts.find((attempt: any) =>
    ["successful", "success", "completed"].includes(String(attempt?.status).toLowerCase()),
  );
  if (successfulAttempt) return { status: "completed", failureReason: null };

  // No success yet: if the most recent attempt failed, surface the failure even
  // though Hub2 keeps the link itself "active".
  const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const hasPendingAttempt = attempts.some((attempt: any) =>
    ["pending", "processing", "initiated", "created"].includes(String(attempt?.status).toLowerCase()),
  );
  if (
    lastAttempt &&
    FAILED_ATTEMPT_STATUSES.includes(String(lastAttempt?.status).toLowerCase()) &&
    !hasPendingAttempt
  ) {
    return { status: "failed", failureReason: extractAttemptFailureReason(lastAttempt) };
  }

  return { status: String(paymentLink?.status ?? "pending").toLowerCase(), failureReason: null };
}

function paymentJson(payment: typeof premiumPaymentsTable.$inferSelect, checkoutUrl: string) {
  const environment = hub2Environment();
  return {
    id: payment.id,
    plan: payment.plan,
    amount: payment.amount,
    status: payment.status,
    checkoutUrl,
    purchaseReference: payment.purchaseReference,
    paymentLinkExpiresAt: payment.paymentLinkExpiresAt?.toISOString() ?? null,
    environment,
    sandboxTestPhone: environment === "sandbox" ? "00000001" : null,
  };
}

router.post("/premium/payments", requireNonDemo, async (req, res): Promise<void> => {
  const plan = req.body?.plan;
  if (!isPlan(plan)) {
    res.status(400).json({ error: "Plan Premium invalide" });
    return;
  }

  const [profile] = await db.select().from(profilesTable)
    .where(eq(profilesTable.id, req.auth!.profileId))
    .limit(1);
  if (!profile) {
    res.status(404).json({ error: "Profil introuvable" });
    return;
  }

  const planDetails = PLANS[plan];
  const purchaseReference = makePurchaseReference(profile.id);
  const expirationDate = new Date(Date.now() + 30 * 60 * 1000);

  let hub2Response: Response;
  try {
    hub2Response = await fetch("https://api.hub2.io/payment-links", {
      method: "POST",
      headers: hub2Headers(),
      body: JSON.stringify({
        purchaseReference,
        description: `JobMatch Premium ${plan === "annual" ? "annuel" : "mensuel"}`,
        amount: planDetails.amount,
        currency: "XOF",
        country: process.env["HUB2_COUNTRY"] ?? "CI",
        type: "single_use",
        expirationDate: expirationDate.toISOString(),
        paymentMethods: ["mobile_money"],
        providers: ["Orange", "MTN", "Moov", "Wave"],
      }),
    });
  } catch (error) {
    req.log.error({ err: error }, "Hub2 payment link request failed");
    res.status(502).json({ error: "Impossible de joindre Hub2" });
    return;
  }

  if (!hub2Response.ok) {
    const body = await hub2Response.text();
    req.log.error({ status: hub2Response.status, body }, "Hub2 rejected payment link");
    res.status(502).json({ error: "Hub2 a refusé la création du paiement" });
    return;
  }

  const hub2PaymentLink = (await hub2Response.json()) as {
    id?: string;
    url?: string;
  };
  if (!hub2PaymentLink.id || !hub2PaymentLink.url) {
    res.status(502).json({ error: "Réponse Hub2 invalide" });
    return;
  }

  const [payment] = await db
    .insert(premiumPaymentsTable)
    .values({
      profileId: profile.id,
      hub2PaymentLinkId: hub2PaymentLink.id,
      purchaseReference,
      plan,
      amount: planDetails.amount,
      paymentLinkExpiresAt: expirationDate,
    })
    .returning();

  res.status(201).json(paymentJson(payment, hub2PaymentLink.url));
});

router.get("/premium/payments/:paymentId/status", requireNonDemo, async (req, res): Promise<void> => {
  const paymentId = Number(req.params["paymentId"]);
  if (!Number.isInteger(paymentId)) {
    res.status(400).json({ error: "Identifiant de paiement invalide" });
    return;
  }

  const [payment] = await db
    .select()
    .from(premiumPaymentsTable)
    .where(eq(premiumPaymentsTable.id, paymentId))
    .limit(1);
  if (!payment) {
    res.status(404).json({ error: "Paiement introuvable" });
    return;
  }
  const [ownedProfile] = await db.select({ id: profilesTable.id })
    .from(profilesTable)
    .where(and(
      eq(profilesTable.id, payment.profileId),
      eq(profilesTable.id, req.auth!.profileId),
    ))
    .limit(1);
  if (!ownedProfile) {
    res.status(404).json({ error: "Paiement introuvable" });
    return;
  }

  let hub2Response: Response;
  try {
    hub2Response = await fetch(`https://api.hub2.io/payment-links/${encodeURIComponent(payment.hub2PaymentLinkId)}`, {
      method: "GET",
      headers: hub2Headers(),
    });
  } catch (error) {
    req.log.error({ err: error, paymentId }, "Hub2 payment status request failed");
    res.status(502).json({ error: "Impossible de vérifier le paiement auprès de Hub2" });
    return;
  }

  if (!hub2Response.ok) {
    const body = await hub2Response.text();
    req.log.error({ status: hub2Response.status, body, paymentId }, "Hub2 status request rejected");
    res.status(502).json({ error: "Hub2 n'a pas pu vérifier le paiement" });
    return;
  }

  const hub2PaymentLink = await hub2Response.json();
  const { status, failureReason } = paymentStatusFromHub2(hub2PaymentLink);
  const completed = status === "completed";
  let premiumUntil = payment.premiumUntil;

  if (completed && !premiumUntil) {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, payment.profileId)).limit(1);
    const currentPremiumUntil =
      profile?.premiumUntil && profile.premiumUntil.getTime() > Date.now()
        ? profile.premiumUntil
        : new Date();
    const durationDays = PLANS[payment.plan as Plan]?.durationDays ?? 30;
    premiumUntil = new Date(currentPremiumUntil.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await db
      .update(premiumPaymentsTable)
      .set({ status: "completed", premiumUntil })
      .where(eq(premiumPaymentsTable.id, payment.id));
    await db
      .update(profilesTable)
      .set({ isPremium: true, premiumUntil })
      .where(eq(profilesTable.id, payment.profileId));
  } else if (!completed && status !== payment.status) {
    await db
      .update(premiumPaymentsTable)
      .set({ status })
      .where(eq(premiumPaymentsTable.id, payment.id));
  }

  const failed = status === "failed";
  res.json({
    id: payment.id,
    status: completed ? "completed" : status,
    isPremium: completed || (premiumUntil ? premiumUntil.getTime() > Date.now() : false),
    premiumUntil: premiumUntil?.toISOString() ?? null,
    failureReason: failed ? failureReasonLabel(failureReason) : null,
    message: completed
      ? "Paiement confirmé. Premium est actif."
      : failed
        ? failureReasonLabel(failureReason)
        : "Paiement en attente de confirmation.",
  });
});

export default router;
