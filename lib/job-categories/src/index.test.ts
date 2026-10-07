import assert from "node:assert/strict";
import test from "node:test";
import { getJobCategory, JOB_CATEGORIES, normalizeCategoryText, scoreCategoryText } from "./index";

test("normalizes accents and case consistently", () => {
  assert.equal(normalizeCategoryText("Électricité À Montréal"), "electricite a montreal");
});

test("scores each distinct matching keyword once", () => {
  assert.equal(scoreCategoryText("vente vente commercial", ["vente", "vente", "commercial"]), 15);
});

test("prioritizes the title over sector and skills", () => {
  assert.equal(
    getJobCategory({
      title: "Développeur logiciel",
      sector: "Finance",
      skills: ["audit"],
    }),
    "Informatique & Tech",
  );
});

test("classifies business development as commercial instead of tech", () => {
  assert.equal(
    getJobCategory({
      title: "Business Development Manager",
      sector: "Technologie",
      skills: ["développement commercial", "prospection"],
      description:
        "Vous développerez le portefeuille clients, piloterez la prospection et les partenariats commerciaux.",
    }),
    "Commercial & Vente",
  );
});

test("uses the description to classify an otherwise broad title", () => {
  assert.equal(
    getJobCategory({
      title: "Manager",
      sector: null,
      skills: [],
      description:
        "Responsable du développement commercial, de l'acquisition de nouveaux clients et de la négociation.",
    }),
    "Commercial & Vente",
  );
});

test("uses sector and skills when the title has no category match", () => {
  assert.equal(
    getJobCategory({
      title: "Responsable d'équipe",
      sector: "Santé",
      skills: ["soins", "patient"],
    }),
    "Santé",
  );
});

test("falls back to Autres when no keyword matches", () => {
  assert.equal(
    getJobCategory({
      title: "Responsable d'équipe",
      sector: null,
      skills: [],
    }),
    "Autres",
  );
});

test("keeps Discover filters aligned with the /jobs/stats category breakdown", () => {
  const offers = [
    {
      title: "Électricien industriel",
      sector: "Bâtiment",
      skills: ["maintenance"],
    },
    {
      title: "Responsable d'équipe",
      sector: "Santé",
      skills: [],
    },
    {
      title: "Responsable d'équipe",
      sector: null,
      skills: ["développement web"],
    },
    {
      title: "Responsable d'équipe",
      sector: null,
      skills: ["créativité"],
    },
  ] as const;

  const categoryCounts = Object.fromEntries(
    JOB_CATEGORIES.map((category) => [category, 0]),
  ) as Record<(typeof JOB_CATEGORIES)[number], number>;
  for (const offer of offers) {
    categoryCounts[getJobCategory(offer)] += 1;
  }

  const statsBreakdown = JOB_CATEGORIES.map((category) => ({
    category,
    count: categoryCounts[category],
  }));
  const discoverCategories = JOB_CATEGORIES.filter((category) => categoryCounts[category] > 0);
  const countedCategories = statsBreakdown
    .filter(({ count }) => count > 0)
    .map(({ category }) => category);

  assert.deepEqual(
    discoverCategories,
    ["Informatique & Tech", "Industrie & Technique", "Santé", "Autres"],
  );
  assert.deepEqual(countedCategories, discoverCategories);
  assert.equal(
    statsBreakdown.reduce((total, { count }) => total + count, 0),
    offers.length,
  );
});