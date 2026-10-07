import type { NextFunction, Request, Response } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db, authSessionsTable, profilesTable } from "@workspace/db";
import { createHash } from "node:crypto";
import { evaluateAuthSessionExpiry } from "../lib/sessionPolicy";

export interface AuthContext {
  profileId: number;
  email: string;
  sessionId: number;
  isDemo: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function bearerToken(req: Request): string | null {
  const value = req.headers.authorization;
  if (!value?.startsWith("Bearer ")) return null;
  const token = value.slice(7).trim();
  return token || null;
}

export async function resolveAuth(req: Request): Promise<AuthContext | null> {
  const token = bearerToken(req);
  if (!token) return null;

  const [row] = await db
    .select({
      sessionId: authSessionsTable.id,
      profileId: profilesTable.id,
      email: profilesTable.email,
      isDemo: authSessionsTable.isDemo,
      expiresAt: authSessionsTable.expiresAt,
      createdAt: authSessionsTable.createdAt,
    })
    .from(authSessionsTable)
    .innerJoin(profilesTable, eq(authSessionsTable.profileId, profilesTable.id))
    .where(
      and(
        eq(authSessionsTable.tokenHash, hashToken(token)),
        isNull(authSessionsTable.revokedAt),
      ),
    )
    .limit(1);

  // Retired review-only sessions must not retain access to a separate experience.
  // Keep their records intact, but require a normal email-authenticated session.
  if (!row?.email || !row.profileId || row.isDemo) {
    return null;
  }

  const sessionExpiry = evaluateAuthSessionExpiry(row.expiresAt, row.createdAt);
  if (!sessionExpiry.valid) return null;

  if (sessionExpiry.renewedExpiresAt) {
    await db.update(authSessionsTable)
      .set({ expiresAt: sessionExpiry.renewedExpiresAt })
      .where(eq(authSessionsTable.id, row.sessionId));
  }

  return {
    profileId: row.profileId,
    email: row.email,
    sessionId: row.sessionId,
    isDemo: row.isDemo,
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = await resolveAuth(req);
  if (!auth) {
    res.status(401).json({ error: "Connexion requise.", code: "AUTH_REQUIRED" });
    return;
  }
  req.auth = auth;
  next();
}

export function requireNonDemo(req: Request, res: Response, next: NextFunction): void {
  if (req.auth?.isDemo) {
    res.status(403).json({
      error: "Cette action est désactivée dans l’accès de démonstration.",
      code: "DEMO_READ_ONLY",
    });
    return;
  }
  next();
}

export { hashToken };