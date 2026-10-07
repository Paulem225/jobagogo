// Integration test: Premium activation via Hub2 sandbox payments.
//
// Verifies the acceptance criteria of the Premium confirmation flow:
//   1. A successful sandbox payment (test MSISDN 00000001) flips the payment
//      to "completed", sets isPremium=true and premiumUntil to +30/+365 days.
//   2. A failed sandbox payment (test MSISDN 00000100, authentication_failed)
//      never grants Premium.
//
// Usage: node artifacts/api-server/scripts/test-premium-sandbox.mjs
// Requires: API server running on localhost:80 (proxy path /api),
//           HUB2_API_KEY / HUB2_MERCHANT_ID in env (sandbox mode).

const API = process.env.API_BASE ?? "http://localhost:80/api";
const DAY = 24 * 60 * 60 * 1000;

let failures = 0;
function assert(cond, label) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures++;
}

async function jsonFetch(url, init) {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function createPayment(plan) {
  const { res, body } = await jsonFetch(`${API}/premium/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) throw new Error(`create payment failed: ${res.status} ${JSON.stringify(body)}`);
  return body;
}

// Drive the Hub2 hosted checkout page programmatically (sandbox only).
// The checkout page exposes a session-scoped API used by its own frontend.
async function payOnCheckout(checkoutUrl, purchaseReference, msisdn) {
  const linkId = checkoutUrl.split("/").pop();
  const page = await (await fetch(checkoutUrl)).text();
  const token = page.match(/SESSION_TOKEN = '([a-f0-9]+)'/)?.[1];
  if (!token) throw new Error("could not extract checkout session token");

  const { res, body } = await jsonFetch(`https://pay.hub2.io/payment/api/${linkId}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Token": token },
    body: JSON.stringify({
      customerReference: purchaseReference,
      paymentMethod: "mobile_money",
      country: "CI",
      provider: "mtn",
      mobileMoney: { msisdn, otp: "" },
    }),
  });
  if (!res.ok) throw new Error(`checkout pay failed: ${res.status} ${JSON.stringify(body)}`);
  return body;
}

async function pollStatus(paymentId, until, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    const { body } = await jsonFetch(`${API}/premium/payments/${paymentId}/status`);
    last = body;
    if (until(body)) return body;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return last;
}

// --- Scenario 1: successful monthly payment activates Premium for 30 days ---
console.log("\n== Scenario 1: successful sandbox payment (monthly) ==");
const okPayment = await createPayment("monthly");
assert(okPayment.status === "pending", "payment starts as pending");
await payOnCheckout(okPayment.checkoutUrl, okPayment.purchaseReference, "00000001");
const okStatus = await pollStatus(okPayment.id, (s) => s.status === "completed");
assert(okStatus.status === "completed", "status becomes completed after successful payment");
assert(okStatus.isPremium === true, "isPremium is true after successful payment");
const days = (new Date(okStatus.premiumUntil).getTime() - Date.now()) / DAY;
assert(days > 29 && days <= 366, `premiumUntil is 30/365 days out (got ~${days.toFixed(1)}d)`);

// --- Scenario 2: failed payment must NOT grant Premium ---
console.log("\n== Scenario 2: failed sandbox payment (annual) ==");
const koPayment = await createPayment("annual");
await payOnCheckout(koPayment.checkoutUrl, koPayment.purchaseReference, "00000100");
// Give Hub2 a moment to register the failed attempt, then check repeatedly
// that the payment never completes.
await new Promise((r) => setTimeout(r, 8000));
const koStatus = await pollStatus(koPayment.id, (s) => s.status === "completed", 9000);
assert(koStatus.status !== "completed", `failed payment stays non-completed (status=${koStatus.status})`);
assert(koStatus.premiumUntil === null, "failed payment grants no premiumUntil");

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
