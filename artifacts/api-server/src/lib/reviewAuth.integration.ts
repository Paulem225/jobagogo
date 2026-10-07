import assert from "node:assert/strict";
import { createHmac, randomInt, randomUUID } from "node:crypto";
import { once } from "node:events";
import { inArray, eq } from "drizzle-orm";
import { authOtpChallengesTable, authSessionsTable, db, pool, profilesTable } from "@workspace/db";
import app from "../app";

// Opt-in local-only verification. Do not run this script against production.
if (process.env.NODE_ENV !== "development" || process.env.RUN_LOCAL_AUTH_TESTS !== "1") {
  throw new Error("This test requires NODE_ENV=development and RUN_LOCAL_AUTH_TESTS=1.");
}

const suffix = randomUUID();
const reviewEmail = `review-fixture-${suffix}@example.test`;
const otherEmail = `ordinary-fixture-${suffix}@example.test`;
const emails = [reviewEmail, otherEmail];
const fixedOtp = String(randomInt(100_000, 1_000_000));
const ordinaryOtp = fixedOtp === "000001" ? "000002" : "000001";
process.env["DEMO_REVIEW_EMAIL"] = reviewEmail;
process.env["DEMO_REVIEW_OTP"] = fixedOtp;

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address !== "string");
const base = `http://127.0.0.1:${address.port}/api`;

interface SessionPayload {
  accessToken: string;
  user: { id: number; isDemo: boolean; emailVerifiedAt: string };
}

async function request<T = unknown>(path: string, body?: unknown, token?: string) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = (response.status === 204 ? null : await response.json()) as T;
  return { status: response.status, data };
}

try {
  const requested = await request<Record<string, unknown>>("/auth/request-code", { email: ` ${reviewEmail.toUpperCase()} ` });
  assert.equal(requested.status, 200);
  assert.deepEqual(Object.keys(requested.data).sort(), ["expiresAt", "retryAfterSeconds", "sent"]);
  assert.equal(requested.data.sent, true);
  assert.equal((await request("/auth/request-code", { email: reviewEmail })).status, 200);
  assert.equal((await db.select().from(authOtpChallengesTable)
    .where(eq(authOtpChallengesTable.email, reviewEmail))).length, 0);

  const wrongCode = fixedOtp.slice(0, 5) + ((Number(fixedOtp[5]) + 1) % 10);
  assert.equal((await request("/auth/verify-code", { email: reviewEmail, code: wrongCode })).status, 401);
  assert.equal((await request("/auth/verify-code", { email: otherEmail, code: fixedOtp })).status, 401);

  await db.insert(authOtpChallengesTable).values({
    email: reviewEmail,
    codeHash: "expired-fixture",
    expiresAt: new Date(Date.now() - 60_000),
    attempts: 5,
  });
  const loggedIn = await request<SessionPayload>("/auth/verify-code", { email: reviewEmail, code: fixedOtp });
  assert.equal(loggedIn.status, 200);
  assert.equal(loggedIn.data.user.isDemo, false);
  assert.ok(loggedIn.data.user.emailVerifiedAt);
  const token = loggedIn.data.accessToken;
  assert.ok(token);
  const sessions = await db.select().from(authSessionsTable)
    .where(eq(authSessionsTable.profileId, loggedIn.data.user.id));
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].isDemo, false);

  const profileBody = {
    name: "Review authentication fixture",
    title: "Comptable",
    skills: ["Comptabilité", "Excel"],
    experienceYears: 3,
    location: "Abidjan",
    remote: false,
    jobTypes: ["CDI"],
    bio: "Temporary local authentication test.",
  };
  assert.equal((await request("/profile", profileBody, token)).status, 200);
  const profile = await request<Record<string, unknown>>("/profile", undefined, token);
  assert.equal(profile.status, 200);
  assert.equal(profile.data.isDemo, false);
  assert.equal(profile.data.isPremium, true); // The same initial trial as every new account.
  assert.equal(profile.data.title, profileBody.title);
  assert.equal((await request<{ hasProfile: boolean }>("/auth/me", undefined, token)).data.hasProfile, true);
  assert.equal((await request("/profile", { ...profileBody, bio: "Ordinary profile edit." }, token)).status, 200);
  assert.equal((await request("/saved", undefined, token)).status, 200);

  // Ordinary OTP verification, cooldown, expiry, and attempt limits still apply.
  const secret = process.env.SESSION_SECRET;
  assert.ok(secret, "SESSION_SECRET is required for ordinary OTP verification.");
  const hash = createHmac("sha256", secret).update(`${otherEmail}:${ordinaryOtp}`).digest("hex");
  const [challenge] = await db.insert(authOtpChallengesTable).values({
    email: otherEmail,
    codeHash: hash,
    expiresAt: new Date(Date.now() + 600_000),
  }).returning();
  assert.equal((await request("/auth/request-code", { email: otherEmail })).status, 429);
  assert.equal((await request("/auth/verify-code", { email: otherEmail, code: fixedOtp })).status, 401);
  const ordinaryLogin = await request<SessionPayload>("/auth/verify-code", { email: otherEmail, code: ordinaryOtp });
  assert.equal(ordinaryLogin.status, 200);
  assert.equal(ordinaryLogin.data.user.isDemo, false);
  assert.equal((await request("/auth/verify-code", { email: otherEmail, code: ordinaryOtp })).status, 401);
  const [consumed] = await db.select().from(authOtpChallengesTable)
    .where(eq(authOtpChallengesTable.id, challenge.id));
  assert.ok(consumed.consumedAt);
  await db.insert(authOtpChallengesTable).values({
    email: otherEmail,
    codeHash: hash,
    expiresAt: new Date(Date.now() - 60_000),
  });
  assert.equal((await request("/auth/verify-code", { email: otherEmail, code: ordinaryOtp })).status, 401);
  await db.insert(authOtpChallengesTable).values({
    email: otherEmail,
    codeHash: hash,
    expiresAt: new Date(Date.now() + 600_000),
    attempts: 5,
  });
  assert.equal((await request("/auth/verify-code", { email: otherEmail, code: ordinaryOtp })).status, 401);
  assert.equal((await request("/auth/logout", {}, token)).status, 204);
  assert.equal((await request("/auth/me", undefined, token)).status, 401);
  console.log("PASS: local review OTP, ordinary sessions, full profile access, Premium trial, and ordinary OTP safeguards.");
} finally {
  await db.delete(authOtpChallengesTable).where(inArray(authOtpChallengesTable.email, emails));
  await db.delete(profilesTable).where(inArray(profilesTable.email, emails));
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await pool.end();
}