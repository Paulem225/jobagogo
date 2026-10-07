import assert from "node:assert/strict";
import test from "node:test";

import { getJobCategory as getApiJobCategory } from "../artifacts/api-server/src/lib/jobCategory.ts";
import { getJobCategory as getDiscoverJobCategory } from "../artifacts/mobile/lib/jobCategory.ts";

const regressionCases = [
  {
    title: "Auxiliaire caissière",
    sector: "Agriculture",
    expected: "Commercial & Vente",
  },
  {
    title: "Responsable laboratoire & qualité",
    sector: "Industrie & Technique",
    expected: "Santé",
  },
  {
    title: "Responsable laboratoire & qualité",
    sector: "Agriculture",
    expected: "Santé",
  },
  {
    title: "Directeur commercial",
    sector: "Agriculture",
    expected: "Commercial & Vente",
  },
];

for (const example of regressionCases) {
  test(`classe correctement « ${example.title} » côté API et Découvrir`, () => {
    const job = { title: example.title, sector: example.sector, skills: [] };

    assert.equal(getApiJobCategory(job), example.expected);
    assert.equal(getDiscoverJobCategory(job), example.expected);
    assert.equal(getApiJobCategory(job), getDiscoverJobCategory(job));
  });
}