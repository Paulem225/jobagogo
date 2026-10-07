import test from "node:test";
import assert from "node:assert/strict";
import { planMissingJobRemovals } from "./jobReconciliation";

const localJobs = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  dedupeKey: `url:https://jobs.test/${index + 1}`,
}));

test("does not remove jobs after an incomplete source snapshot", () => {
  const plan = planMissingJobRemovals(localJobs, new Set(), false);
  assert.deepEqual(plan, { ids: [], skippedReason: "incomplete-snapshot" });
});

test("blocks an abnormally large automatic removal", () => {
  const seen = new Set(localJobs.slice(0, 2).map((job) => job.dedupeKey));
  const plan = planMissingJobRemovals(localJobs, seen, true);
  assert.deepEqual(plan, { ids: [], skippedReason: "excessive-removal" });
});

test("allows a small removal after a complete source snapshot", () => {
  const seen = new Set(localJobs.slice(0, 7).map((job) => job.dedupeKey));
  const plan = planMissingJobRemovals(localJobs, seen, true);
  assert.deepEqual(plan, { ids: [8], skippedReason: null });
});