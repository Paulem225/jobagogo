import assert from "node:assert/strict";
import test from "node:test";
import { createPremiumTrial, getPremiumTrialStatus } from "./premiumTrial";

const start = new Date("2026-09-28T12:00:00.000Z");

test("grants a seven-day Premium trial to a new profile", () => {
  const trial = createPremiumTrial(start);

  assert.equal(trial.isPremium, true);
  assert.equal(trial.premiumUntil.toISOString(), "2026-10-05T12:00:00.000Z");
  assert.equal(trial.premiumTrialUntil, trial.premiumUntil);
});

test("reports the account as freemium after an unconverted trial expires", () => {
  const trial = createPremiumTrial(start);
  const status = getPremiumTrialStatus(trial, new Date("2026-10-05T12:00:00.001Z"));

  assert.deepEqual(status, {
    isPremium: false,
    isPremiumTrial: false,
    isPremiumTrialExpired: true,
  });
});

test("does not label a paid extension as a free trial", () => {
  const trial = createPremiumTrial(start);
  const paidUntil = new Date(trial.premiumTrialUntil.getTime() + 30 * 24 * 60 * 60 * 1000);
  const status = getPremiumTrialStatus(
    { ...trial, premiumUntil: paidUntil },
    new Date("2026-10-01T12:00:00.000Z"),
  );

  assert.deepEqual(status, {
    isPremium: true,
    isPremiumTrial: false,
    isPremiumTrialExpired: false,
  });
});

test("leaves accounts without a trial marker unchanged", () => {
  const status = getPremiumTrialStatus(
    { isPremium: false, premiumUntil: null, premiumTrialUntil: null },
    start,
  );

  assert.deepEqual(status, {
    isPremium: false,
    isPremiumTrial: false,
    isPremiumTrialExpired: false,
  });
});