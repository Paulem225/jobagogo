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

export const CATEGORY_KEYWORDS: Readonly<Record<JobCategory, readonly string[]>> = {
  "Finance & Comptabilité": ["finance", "comptab", "audit", "banque", "assurance", "fiscal", "tresor"],
  "Commercial & Vente": [
    "commercial",
    "vente",
    "vendeur",
    "business development",
    "business developer",
    "developpement commercial",
    "developpement des affaires",
    "prospection",
    "acquisition client",
    "relation client",
    "negociation",
    "partenariat",
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
  "Marketing & Communication": [
    "marketing",
    "communication",
    "community manager",
    "digital",
    "social media",
    "publicite",
    "media",
  ],
  "Informatique & Tech": [
    "informatique",
    "developpeur",
    "software developer",
    "web developer",
    "developpement logiciel",
    "developpement web",
    "full stack",
    "frontend",
    "backend",
    "devops",
    "programming",
    "coding",
    "software",
    "data",
    "cyber",
    "reseau",
    "support it",
    "webmaster",
  ],
  "Ressources humaines": ["recrut", "ressources humaines", "rh", "talent", "paie"],
  "Logistique & Transport": ["logistique", "transport", "supply chain", "chauffeur", "coursier", "magasinier"],
  "Industrie & Technique": [
    "industrie",
    "maintenance",
    "mecan",
    "production",
    "qualite",
    "technicien",
    "electricite",
    "ingenieur",
  ],
  Santé: ["sante", "medical", "medecin", "infirm", "pharm", "laboratoire", "soin"],
  Éducation: ["education", "enseignement", "professeur", "enseignant", "formation", "ecole"],
  "BTP & Immobilier": ["btp", "batiment", "construction", "chantier", "immobilier", "architect"],
  "Hôtellerie & Restauration": ["hotel", "hotellerie", "restaurant", "cuisine", "reception", "tourisme"],
  Agriculture: ["agric", "agronom", "elevage", "peche"],
  Juridique: ["jurid", "avocat", "droit", "conformite"],
  Autres: [],
};

export type JobCategoryInput = {
  title: string;
  sector?: string | null;
  skills: readonly string[];
  description?: string | null;
};

export function normalizeCategoryText(value: string): string {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function scoreCategoryText(value: string, keywords: readonly string[]): number {
  const text = normalizeCategoryText(value);
  return [...new Set(keywords)].reduce(
    (score, keyword) => (text.includes(normalizeCategoryText(keyword)) ? score + keyword.length : score),
    0,
  );
}

export function getJobCategory(job: JobCategoryInput): JobCategory {
  const scoredCategories = JOB_CATEGORIES.filter((category) => category !== "Autres")
    .map((category) => {
      const keywords = CATEGORY_KEYWORDS[category];
      const titleScore = scoreCategoryText(job.title, keywords);
      const sectorScore = scoreCategoryText(job.sector ?? "", keywords);
      const skillsScore = scoreCategoryText(job.skills.join(" "), keywords);
      const descriptionScore = scoreCategoryText(job.description ?? "", keywords);

      return {
        category,
        // The title remains the strongest signal, while the description can
        // disambiguate broad titles such as "Manager" or "Business Developer".
        score: titleScore * 100 + sectorScore * 10 + descriptionScore * 5 + skillsScore,
      };
    })
    .sort((a, b) => b.score - a.score);

  return scoredCategories[0]?.score ? scoredCategories[0].category : "Autres";
}