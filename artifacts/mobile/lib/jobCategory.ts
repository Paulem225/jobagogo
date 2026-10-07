export const JOB_CATEGORIES = [
  "Finance & Comptabilité",
  "Commercial & Vente",
  "Administration",
  "Marketing & Communication",
  "Informatique & Tech",
  "Ressources humaines",
  "Logistique & Transport",
  "Industrie & Technique",
  "Santé",
  "Éducation",
  "BTP & Immobilier",
  "Hôtellerie & Restauration",
  "Agriculture",
  "Juridique",
  "Autres",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

const CATEGORY_KEYWORDS: Record<JobCategory, string[]> = {
  "Finance & Comptabilité": ["finance", "comptab", "audit", "banque", "assurance", "fiscal", "tresor"],
  "Commercial & Vente": [
    "commercial",
    "vente",
    "vendeur",
    "business developer",
    "account manager",
    "clientele",
    "sales",
    "caissier",
    "caissiere",
    "caisse",
    "hotesse de caisse",
    "guichetier",
    "guichetiere",
  ],
  Administration: ["admin", "secret", "assistant", "office manager", "accueil", "gestionnaire"],
  "Marketing & Communication": ["marketing", "communication", "community manager", "digital", "social media", "publicite", "media"],
  "Informatique & Tech": ["informatique", "develop", "software", "data", "cyber", "reseau", "support it", "webmaster"],
  "Ressources humaines": ["recrut", "ressources humaines", "rh", "talent", "paie"],
  "Logistique & Transport": ["logistique", "transport", "supply chain", "chauffeur", "coursier", "magasinier"],
  "Industrie & Technique": ["industrie", "maintenance", "mecan", "production", "qualite", "technicien", "electricite", "ingenieur"],
  Santé: ["sante", "medical", "medecin", "infirm", "pharm", "laboratoire", "soin"],
  Éducation: ["education", "enseignement", "professeur", "enseignant", "formation", "ecole"],
  "BTP & Immobilier": ["btp", "batiment", "construction", "chantier", "immobilier", "architect"],
  "Hôtellerie & Restauration": ["hotel", "hotellerie", "restaurant", "cuisine", "reception", "tourisme"],
  Agriculture: ["agric", "agronom", "elevage", "peche"],
  Juridique: ["jurid", "avocat", "droit", "conformite"],
  Autres: [],
};

function normalizeCategoryText(value: string): string {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function scoreCategoryText(value: string, keywords: string[]): number {
  const text = normalizeCategoryText(value);
  return [...new Set(keywords)].reduce(
    (score, keyword) => (text.includes(keyword) ? score + keyword.length : score),
    0,
  );
}

function pickHighestScoringCategory(scores: Array<{ category: JobCategory; score: number }>): JobCategory | null {
  let best: { category: JobCategory; score: number } | null = null;
  for (const candidate of scores) {
    if (candidate.score > 0 && (!best || candidate.score > best.score)) {
      best = candidate;
    }
  }
  return best?.category ?? null;
}

export function getJobCategory(job: { title: string; sector?: string | null; skills: string[] }): JobCategory {
  const categories = JOB_CATEGORIES.filter((category) => category !== "Autres");
  const scoreField = (value: string) =>
    categories.map((category) => ({
      category,
      score: scoreCategoryText(value, CATEGORY_KEYWORDS[category]),
    }));

  // A specific title is the strongest signal. This prevents a broad sector
  // label such as "Agriculture" from misclassifying a commercial position.
  return (
    pickHighestScoringCategory(scoreField(job.title)) ??
    pickHighestScoringCategory(scoreField(job.sector ?? "")) ??
    pickHighestScoringCategory(scoreField(job.skills.join(" "))) ??
    "Autres"
  );
}