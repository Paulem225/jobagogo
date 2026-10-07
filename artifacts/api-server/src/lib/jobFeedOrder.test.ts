import test from "node:test";
import assert from "node:assert/strict";
import { diversifyJobsByCompany } from "./jobFeedOrder";

const scrapedAt = new Date("2026-09-14T12:00:00.000Z");

test("interleaves companies within the same publication day", () => {
  const jobs = [
    { id: 4, company: "YESHI GROUP", postedAt: "2026-09-14T12:04:00.000Z", scrapedAt },
    { id: 3, company: "YESHI GROUP", postedAt: "2026-09-14T12:03:00.000Z", scrapedAt },
    { id: 8, company: "Nouvelle entreprise", postedAt: "2026-09-14T12:02:00.000Z", scrapedAt },
    { id: 7, company: "Autre entreprise", postedAt: "2026-09-14T12:01:00.000Z", scrapedAt },
  ];

  assert.deepEqual(
    diversifyJobsByCompany(jobs).map((job) => job.company),
    ["Nouvelle entreprise", "Autre entreprise", "YESHI GROUP", "YESHI GROUP"],
  );
});

test("keeps newer publication days before older ones", () => {
  const jobs = [
    { id: 1, company: "Entreprise A", postedAt: "2026-09-14T08:00:00.000Z", scrapedAt },
    { id: 99, company: "Entreprise B", postedAt: "2026-09-13T20:00:00.000Z", scrapedAt },
  ];

  assert.deepEqual(
    diversifyJobsByCompany(jobs).map((job) => job.id),
    [1, 99],
  );
});