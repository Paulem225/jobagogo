import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTH_SESSION_RENEWAL_WINDOW_MS,
  AUTH_SESSION_TTL_MS,
  LEGACY_AUTH_SESSION_GRACE_MS,
  LEGACY_AUTH_SESSION_TTL_MS,
  evaluateAuthSessionExpiry,
} from "./sessionPolicy";

const now = new Date("2026-09-28T12:00:00.000Z");

test("keeps a fresh session without writing a new expiry", () => {
  const createdAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(now.getTime() + 80 * 24 * 60 * 60 * 1000);

  assert.deepEqual(evaluateAuthSessionExpiry(expiresAt, createdAt, now), {
    valid: true,
    renewedExpiresAt: null,
  });
});

test("renews an active session inside the renewal window", () => {
  const createdAt = new Date(now.getTime() - 76 * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(now.getTime() + AUTH_SESSION_RENEWAL_WINDOW_MS);

  assert.deepEqual(evaluateAuthSessionExpiry(expiresAt, createdAt, now), {
    valid: true,
    renewedExpiresAt: new Date(now.getTime() + AUTH_SESSION_TTL_MS),
  });
});

test("restores a legacy 30-day session during the transition grace period", () => {
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  const createdAt = new Date(now.getTime() - LEGACY_AUTH_SESSION_TTL_MS - twoDaysMs);
  const expiresAt = new Date(now.getTime() - twoDaysMs);

  assert.deepEqual(evaluateAuthSessionExpiry(expiresAt, createdAt, now), {
    valid: true,
    renewedExpiresAt: new Date(now.getTime() + AUTH_SESSION_TTL_MS),
  });
});

test("does not restore an expired new-policy session", () => {
  const createdAt = new Date(now.getTime() - AUTH_SESSION_TTL_MS);
  const expiresAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  assert.deepEqual(evaluateAuthSessionExpiry(expiresAt, createdAt, now), {
    valid: false,
    renewedExpiresAt: null,
  });
});

test("does not restore a legacy session beyond its transition grace period", () => {
  const oneMillisecondPastGrace = 1;
  const createdAt = new Date(
    now.getTime() - LEGACY_AUTH_SESSION_TTL_MS - LEGACY_AUTH_SESSION_GRACE_MS - oneMillisecondPastGrace,
  );
  const expiresAt = new Date(now.getTime() - LEGACY_AUTH_SESSION_GRACE_MS - oneMillisecondPastGrace);

  assert.deepEqual(evaluateAuthSessionExpiry(expiresAt, createdAt, now), {
    valid: false,
    renewedExpiresAt: null,
  });
});