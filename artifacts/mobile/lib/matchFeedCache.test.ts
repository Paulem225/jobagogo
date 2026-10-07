import test from "node:test";
import assert from "node:assert/strict";
import {
  MATCH_FEED_CACHE_TTL_MS,
  parseMatchFeedCache,
} from "./matchFeedCache";

const now = Date.parse("2026-09-28T12:00:00.000Z");

function match(id: number, jobFields: Record<string, unknown> = {}) {
  return {
    job: { id, ...jobFields },
    fitScore: 80,
  };
}

test("accepts a recent feed and removes expired or deleted offers", () => {
  const entry = parseMatchFeedCache(
    JSON.stringify({
      savedAt: now - 60_000,
      matches: [
        match(1),
        match(2, { expiresAt: "2026-09-28T11:00:00.000Z" }),
        match(3, { deletedAt: "2026-09-28T11:30:00.000Z" }),
        match(4, { status: "EXPIRED" }),
      ],
    }),
    now,
  );

  assert.deepEqual(entry?.matches.map((item) => item.job.id), [1]);
});

test("rejects feeds that exceed the retention window or have invalid data", () => {
  const old = parseMatchFeedCache(
    JSON.stringify({ savedAt: now - MATCH_FEED_CACHE_TTL_MS - 1, matches: [match(1)] }),
    now,
  );
  const malformed = parseMatchFeedCache("{not json", now);

  assert.equal(old, null);
  assert.equal(malformed, null);
});