import test from "node:test";
import assert from "node:assert/strict";
import { jobDedupeKey, normalizeJobSourceUrl } from "./jobIdentity";

test("normalizes equivalent source URLs into the same value", () => {
  assert.equal(
    normalizeJobSourceUrl(" HTTPS://Jobs.Test/offer-123/#tracking "),
    "https://jobs.test/offer-123",
  );
});

test("uses the canonical source URL as the primary offer identity", () => {
  assert.equal(
    jobDedupeKey({
      title: "Commercial",
      company: "Entreprise",
      sourceUrl: "https://jobs.test/offer-123/",
    }),
    "url:https://jobs.test/offer-123",
  );
});

test("uses stable fallback fields when no source URL exists", () => {
  assert.equal(
    jobDedupeKey({
      title: "  Responsable   commercial ",
      company: "Entreprise",
      location: "Abidjan",
      postedAt: "2026-09-18",
    }),
    "fallback|||responsable commercial|||entreprise|||abidjan|||2026-09-18",
  );
});