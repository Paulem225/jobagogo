import assert from "node:assert/strict";
import { test } from "node:test";
import { acceptsReviewOtp, isConfiguredReviewEmail } from "./reviewOtp";

const config = { email: "review-fixture@example.test", otp: "654321" };

test("the configured code is valid only for its configured email", () => {
  assert.equal(acceptsReviewOtp(config.email, config.otp, config), true);
  assert.equal(acceptsReviewOtp("other@example.test", config.otp, config), false);
  assert.equal(acceptsReviewOtp(config.email, "654320", config), false);
});

test("email comparison normalizes case and surrounding whitespace", () => {
  assert.equal(acceptsReviewOtp(" REVIEW-FIXTURE@EXAMPLE.TEST ", config.otp, config), true);
  assert.equal(acceptsReviewOtp(config.email, config.otp, {
    email: " REVIEW-FIXTURE@EXAMPLE.TEST ",
    otp: ` ${config.otp} `,
  }), true);
});

test("missing or invalid configuration never enables a fixed-code login", () => {
  for (const invalid of [
    {},
    { email: config.email },
    { otp: config.otp },
    { email: config.email, otp: "" },
    { email: config.email, otp: "12345" },
    { email: config.email, otp: "abcdef" },
    { email: "invalid", otp: config.otp },
  ]) {
    assert.equal(isConfiguredReviewEmail(config.email, invalid), false);
    assert.equal(acceptsReviewOtp(config.email, config.otp, invalid), false);
  }
});

test("malformed supplied codes are never accepted", () => {
  for (const code of ["", "65432", "6543210", "654321 ", "abcdef"]) {
    assert.equal(acceptsReviewOtp(config.email, code, config), false);
  }
});