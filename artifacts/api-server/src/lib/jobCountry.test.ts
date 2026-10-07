import test from "node:test";
import assert from "node:assert/strict";
import { isCoteDIvoireCountry, normalizeCountry } from "./jobCountry";

test("normalizes Côte d'Ivoire country labels", () => {
  assert.equal(normalizeCountry("Côte d’Ivoire"), "cote d ivoire");
  assert.equal(isCoteDIvoireCountry("Côte d'Ivoire"), true);
  assert.equal(isCoteDIvoireCountry("Sénégal"), false);
});