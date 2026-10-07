import type { Profile } from "@workspace/db";
import type { Job } from "@workspace/db";
import { extractExperienceYearsFromDescription } from "./jobDescriptionParser";

export interface MatchScore {
  fitScore: number;
  titleScore: number;
  skillScore: number;
  experienceScore: number;
}

export type RankedMatch = MatchScore & {
  job: Pick<Job, "id">;
};

export function compareMatchResults(a: RankedMatch, b: RankedMatch): number {
  if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
  if (b.titleScore !== a.titleScore) return b.titleScore - a.titleScore;
  if (b.skillScore !== a.skillScore) return b.skillScore - a.skillScore;
  return b.job.id - a.job.id;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsWholePhrase(text: string, phrase: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedText || !normalizedPhrase) return false;

  const textWords = normalizedText.split(" ");
  const phraseWords = normalizedPhrase.split(" ");
  for (let i = 0; i <= textWords.length - phraseWords.length; i++) {
    if (phraseWords.every((word, offset) => textWords[i + offset] === word)) {
      return true;
    }
  }
  return false;
}

function computeTitleScore(profileTitle: string | null, jobTitle: string): number {
  if (!profileTitle) return 80; // neutral if user didn't specify a target role

  const prof = normalizeText(profileTitle);
  const job = normalizeText(jobTitle);

  if (!prof || !job) return 80;

  // Define role families and their synonyms
  const roleFamilies: { keywords: string[]; aliases: string[] }[] = [
    { keywords: ["chef de projet", "chef de projets", "project manager", "cheffe de projet"], aliases: ["chargé de projet", "coordinateur", "coordinatrice", "scrum master", "product owner", "facilitateur agile"] },
    { keywords: ["commercial", "business developer", "vendeur", "sales"], aliases: ["vente", "conseiller client", "account manager", "business development"] },
    { keywords: ["technicien", "technicienne", "technique"], aliases: ["maintenance", "réparation", "installation", "technicien batiment"] },
    { keywords: ["développeur", "developpeur", "developer", "ingenieur", "ingénieur"], aliases: ["programmeur", "software engineer", "web"] },
    { keywords: ["comptable", "comptabilité"], aliases: ["accountant", "accounting"] },
    { keywords: ["finance", "financement", "financements", "banque", "bancaire", "crédit"], aliases: ["financial", "structured finance", "corporate finance", "investment banking", "trésorerie", "audit"] },
    { keywords: ["marketing", "marketeur", "chargé de communication", "chargée de communication"], aliases: ["communication", "digital marketing", "seo", "content manager", "community manager"] },
    { keywords: ["rh", "ressources humaines", "hr"], aliases: ["recrutement", "payroll", "talent", "gestionnaire de paie"] },
    { keywords: ["assistant", "assistante", "secrétaire"], aliases: ["administratif", "office manager", "support"] },
    { keywords: ["infirmier", "infirmière", "soignant"], aliases: ["medical", "santé", "hospitalier"] },
    { keywords: ["enseignant", "enseignante", "professeur"], aliases: ["formateur", "education", "pédagogue"] },
  ];

  const findFamily = (text: string) => {
    for (const family of roleFamilies) {
      for (const kw of family.keywords) {
        if (containsWholePhrase(text, kw)) return family;
      }
      for (const alias of family.aliases) {
        if (containsWholePhrase(text, alias)) return family;
      }
    }
    return null;
  };

  const profFamily = findFamily(prof);
  const jobFamily = findFamily(job);

  // Exact family match
  if (profFamily && jobFamily && profFamily === jobFamily) return 100;

  // Direct keyword overlap (e.g. "digital project manager" contains "project manager")
  const profWords = prof.split(/\s+/).filter((w) => w.length > 2);
  const jobWords = job.split(/\s+/).filter((w) => w.length > 2);
  const overlap = profWords.filter((w) => jobWords.includes(w)).length;
  if (overlap > 0) return 70;

  // User has a specific role but the job belongs to a different family -> heavy penalty
  if (profFamily && jobFamily && profFamily !== jobFamily) return 0;

  // One is specific, the other is generic -> moderate match
  if (profFamily || jobFamily) return 30;

  return 40;
}

function computeSkillScore(profileSkills: string[], jobSkills: string[]): number {
  if (jobSkills.length === 0) return 80;
  if (profileSkills.length === 0) return 0;

  let matched = 0;
  for (const jobSkill of jobSkills) {
    const found = profileSkills.some(
      (profileSkill) =>
        containsWholePhrase(profileSkill, jobSkill) ||
        containsWholePhrase(jobSkill, profileSkill),
    );
    if (found) matched++;
  }

  return Math.round((matched / jobSkills.length) * 100);
}

function computeExperienceScore(
  profileYears: number,
  jobTitle: string,
  jobExperienceYears?: number | null
): number {
  // Use real data from the job when available, then recover a missing
  // minimum from the description instead of treating it as unknown.
  const required = jobExperienceYears ?? null;
  if (required != null) {
    if (profileYears >= required) return 100;
    const diff = required - profileYears;
    return Math.max(0, 100 - diff * 20);
  }

  // Fall back to title-based estimation
  const title = normalizeText(jobTitle);
  let expectedMin = 0;
  let expectedMax = 15;

  if (
    title.includes("senior") ||
    title.includes("lead") ||
    title.includes("principal") ||
    title.includes("vice president") ||
    title.includes("president") ||
    title.includes("head") ||
    title.includes("chief") ||
    title.includes("directeur") ||
    title.includes("director")
  ) {
    expectedMin = 5; expectedMax = 15;
  } else if (title.includes("junior") || title.includes("débutant") || title.includes("entry")) {
    expectedMin = 0; expectedMax = 3;
  } else if (title.includes("manager") || title.includes("directeur") || title.includes("director")) {
    expectedMin = 7; expectedMax = 20;
  } else if (title.includes("stagiaire") || title.includes("intern") || title.includes("alternant")) {
    expectedMin = 0; expectedMax = 1;
  } else {
    expectedMin = 2; expectedMax = 8;
  }

  if (profileYears >= expectedMin && profileYears <= expectedMax) return 100;
  if (profileYears < expectedMin) {
    const diff = expectedMin - profileYears;
    return Math.max(0, 100 - diff * 20);
  }
  const diff = profileYears - expectedMax;
  return Math.max(60, 100 - diff * 10);
}

export function computeMatchScore(profile: Profile, job: Job): MatchScore {
  const titleScore = computeTitleScore(profile.title, job.title);
  const skillScore = computeSkillScore(profile.skills, job.skills);
  const experienceScore = computeExperienceScore(
    profile.experienceYears,
    job.title,
    job.experienceYears ?? extractExperienceYearsFromDescription(job.description),
  );

  const fitScore = Math.round(
    titleScore * 0.6 +
    skillScore * 0.25 +
    experienceScore * 0.15
  );

  return {
    fitScore: Math.min(100, Math.max(0, fitScore)),
    titleScore: Math.min(100, Math.max(0, titleScore)),
    skillScore: Math.min(100, Math.max(0, skillScore)),
    experienceScore: Math.min(100, Math.max(0, experienceScore)),
  };
}
