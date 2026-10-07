import test from "node:test";
import assert from "node:assert/strict";
import { formatRelativeJobDate, getJobDate } from "./jobDates";

test("labels an offer published today as Aujourd'hui", () => {
  assert.equal(
    formatRelativeJobDate(
      {
        postedAt: "2026-09-16T08:30:00.000Z",
        scrapedAt: "2026-09-16T12:00:00.000Z",
      },
      new Date("2026-09-16T12:00:00.000Z"),
    ),
    "Aujourd'hui",
  );
});

test("uses postedAt for an offer published several days ago", () => {
  assert.equal(
    formatRelativeJobDate(
      {
        postedAt: "2026-08-04T00:00:00.000Z",
        scrapedAt: "2026-09-16T12:00:00.000Z",
      },
      new Date("2026-09-16T12:00:00.000Z"),
    ),
    "Il y a 1 mois",
  );
});

test("does not invent a date when postedAt is absent or invalid", () => {
  const today = new Date("2026-09-16T12:00:00.000Z");
  assert.equal(getJobDate({ postedAt: null, scrapedAt: today.toISOString() }), null);
  assert.equal(formatRelativeJobDate({ postedAt: null, scrapedAt: today.toISOString() }, today), null);
  assert.equal(formatRelativeJobDate({ postedAt: "not-a-date", scrapedAt: today.toISOString() }, today), null);
});