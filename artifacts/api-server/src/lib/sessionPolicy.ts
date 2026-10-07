export const AUTH_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const AUTH_SESSION_RENEWAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export const LEGACY_AUTH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const LEGACY_AUTH_SESSION_GRACE_MS = 30 * 24 * 60 * 60 * 1000;
const AUTH_SESSION_CLOCK_SKEW_MS = 60 * 1000;

export function evaluateAuthSessionExpiry(
  expiresAt: Date,
  createdAt: Date,
  now = new Date(),
): { valid: boolean; renewedExpiresAt: Date | null } {
  const remainingMs = expiresAt.getTime() - now.getTime();
  const issuedLifetimeMs = expiresAt.getTime() - createdAt.getTime();

  if (remainingMs <= 0) {
    const isLegacySession =
      issuedLifetimeMs >= 0 &&
      issuedLifetimeMs <= LEGACY_AUTH_SESSION_TTL_MS + AUTH_SESSION_CLOCK_SKEW_MS;
    const isWithinLegacyGrace = -remainingMs <= LEGACY_AUTH_SESSION_GRACE_MS;

    if (!isLegacySession || !isWithinLegacyGrace) {
      return { valid: false, renewedExpiresAt: null };
    }
  }

  if (remainingMs <= AUTH_SESSION_RENEWAL_WINDOW_MS) {
    return {
      valid: true,
      renewedExpiresAt: new Date(now.getTime() + AUTH_SESSION_TTL_MS),
    };
  }

  return { valid: true, renewedExpiresAt: null };
}