import type { NextFunction, Request, Response } from "express";
import { resolveAuth } from "./auth";

const ADMIN_EMAILS_ENV = "ADMIN_EMAILS";

function configuredAdminEmails(): Set<string> {
  return new Set(
    (process.env[ADMIN_EMAILS_ENV] ?? "")
      .split(/[,;\s]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function auditAdminRequest(req: Request, statusCode: number, level: "info" | "warn"): void {
  const payload = {
    event: "admin_api_access",
    method: req.method,
    path: req.path,
    statusCode,
  };

  if (level === "warn") {
    req.log.warn(payload, "Admin API access denied");
  } else {
    req.log.info(payload, "Admin API access");
  }
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = await resolveAuth(req);
  if (!auth) {
    auditAdminRequest(req, 401, "warn");
    res.status(401).json({
      error: "Authentification administrateur requise.",
      code: "ADMIN_AUTH_REQUIRED",
    });
    return;
  }

  const adminEmails = configuredAdminEmails();
  if (adminEmails.size === 0) {
    auditAdminRequest(req, 503, "warn");
    res.status(503).json({
      error: "L’accès administrateur n’est pas configuré.",
      code: "ADMIN_ACCESS_NOT_CONFIGURED",
    });
    return;
  }

  if (!adminEmails.has(auth.email.toLowerCase())) {
    auditAdminRequest(req, 403, "warn");
    res.status(403).json({
      error: "Cette session n’a pas les droits administrateur.",
      code: "ADMIN_FORBIDDEN",
    });
    return;
  }

  req.auth = auth;
  res.on("finish", () => auditAdminRequest(req, res.statusCode, "info"));
  next();
}
