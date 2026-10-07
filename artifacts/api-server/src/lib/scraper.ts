import type { InsertJob, Job } from "@workspace/db";
import { analyzeJobsWithClaude, type EnrichedJobFields } from "./aiJobAnalyzer";
import { enrichJobFromDescription } from "./jobDescriptionParser";
import { logger } from "./logger";
import { canonicalJobCountry, isCoteDIvoireCountry, TARGET_JOB_COUNTRY } from "./jobCountry";
import { jobDedupeKey, normalizeJobSourceUrl, type JobIdentityInput } from "./jobIdentity";

const EXTERNAL_API_BASE_URL = "https://node-type-script-build.replit.app/api";
const EXTERNAL_API = `${EXTERNAL_API_BASE_URL}/jobs`;

const EXTERNAL_PAGE_LIMIT = 200; // API limit

interface ExternalJob {
  id: number;
  title: string;
  company: string;
  logoUrl?: string | null;
  description: string;
  location: string;
  remote: boolean;
  skills: string[];
  jobType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  source: string;
  sourceUrl: string;
  postedAt: string | null;
  experienceYears: number | null;
  sector: string | null;
  diplomaRequired: string | null;
  country?: string | null;
}

export interface ScrapeOptions {
  keywords?: string;
  location?: string;
}

export interface ScrapeAnalysisOptions {
  requestTimeoutMs?: number;
}

export interface ExternalJobResult {
  jobs: Omit<InsertJob, "scrapedAt">[];
  seenDedupeKeys: Set<string>;
  snapshotComplete: boolean;
  sourceTotalJobs: number;
  fetchedSourceJobs: number;
  optimization: ScrapeOptimizationStats;
}

export interface ScrapeOptimizationStats {
  fetchedJobs: number;
  uniqueJobs: number;
  duplicateJobs: number;
  persistedAnalysisHits: number;
  localOnlyJobs: number;
  analysisCacheHits: number;
  analysisRequests: number;
  claudeCalls: number;
  fallbackJobs: number;
  circuitOpened: boolean;
}

export function isCoteDIvoireExternalJob(job: Pick<ExternalJob, "country">): boolean {
  return isCoteDIvoireCountry(job.country);
}

type ExistingJob = Pick<
  Job,
  | "title"
  | "company"
  | "sourceUrl"
  | "dedupeKey"
  | "location"
  | "postedAt"
  | "description"
  | "skills"
  | "experienceYears"
  | "diplomaRequired"
>;

function jobIdentity(job: JobIdentityInput): string {
  return jobDedupeKey(job);
}

function normalizeComparisonText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function analysisFingerprint(job: { title: string; description: string }): string {
  return `${normalizeComparisonText(job.title)}\n${normalizeComparisonText(job.description)}`;
}

function hasSameAnalysisInput(
  current: { title: string; description: string },
  existing: Pick<Job, "title" | "description">,
): boolean {
  return analysisFingerprint(current) === analysisFingerprint(existing);
}

function analysisFromJob(job: Pick<Job, "skills" | "experienceYears" | "diplomaRequired">): EnrichedJobFields {
  return {
    skills: job.skills,
    experienceYears: job.experienceYears,
    diplomaRequired: job.diplomaRequired,
  };
}

function deduplicateExternalJobs(jobs: ExternalJob[]): ExternalJob[] {
  const uniqueJobs: ExternalJob[] = [];
  const indexByIdentity = new Map<string, number>();

  for (const job of jobs) {
    const identity = jobIdentity(job);
    const existingIndex = indexByIdentity.get(identity);
    if (existingIndex === undefined) {
      indexByIdentity.set(identity, uniqueJobs.length);
      uniqueJobs.push(job);
      continue;
    }

    const existing = uniqueJobs[existingIndex];
    if (hasUnavailableDescription(existing.description) && !hasUnavailableDescription(job.description)) {
      uniqueJobs[existingIndex] = job;
    }
  }

  return uniqueJobs;
}

function normalizeLogoUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function normalizeExperienceYears(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

function hasUnavailableDescription(description: string | null | undefined): boolean {
  const normalized = (description ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return !normalized || /^(description\s+(non\s+disponible|not available)|non disponible|n\/a|na)\.?$/i.test(normalized);
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    "&amp;": "&",
    "&apos;": "'",
    "&gt;": ">",
    "&lt;": "<",
    "&nbsp;": " ",
    "&quot;": "\"",
    "&#39;": "'",
  };

  return value
    .replace(/&(amp|apos|gt|lt|nbsp|quot);|&#39;/gi, (entity) => namedEntities[entity.toLowerCase()] ?? entity)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 10)));
}

export function extractLinkedInDescriptionFromHtml(html: string): string | null {
  const richDescriptionMatch = html.match(
    /<div[^>]+class=["'][^"']*description__text[^"']*description__text--rich[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  );
  const rawDescription = richDescriptionMatch?.[1];
  if (!rawDescription) return null;

  const text = decodeHtmlEntities(
    rawDescription
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "• ")
      .replace(/<\/(p|li|h[1-6]|div)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text.length > 40 ? text : null;
}

export async function recoverDescriptionFromSource(job: {
  source: string;
  sourceUrl?: string | null;
  description: string | null;
}): Promise<string | null> {
  const isLinkedIn = /linkedin/i.test(job.source) || /linkedin\./i.test(job.sourceUrl ?? "");
  if (!job.sourceUrl || !isLinkedIn || !hasUnavailableDescription(job.description)) {
    return null;
  }

  try {
    const response = await fetch(job.sourceUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; Jobagogo/1.0; +https://jobagogo.app)",
      },
    });
    if (!response.ok) return null;

    return extractLinkedInDescriptionFromHtml(await response.text());
  } catch (error) {
    logger.warn({ err: error, sourceUrl: job.sourceUrl }, "Unable to recover LinkedIn job description");
    return null;
  }
}

async function recoverMissingLinkedInDescriptions(jobs: ExternalJob[]): Promise<ExternalJob[]> {
  const recoveredJobs = [...jobs];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < recoveredJobs.length) {
      const index = nextIndex++;
      const job = recoveredJobs[index];
      const description = await recoverDescriptionFromSource(job);
      if (description) {
        recoveredJobs[index] = { ...job, description };
        logger.info({ sourceUrl: job.sourceUrl }, "Recovered LinkedIn job description");
      }
    }
  }

  await Promise.all(Array.from({ length: 4 }, () => worker()));
  return recoveredJobs;
}

export async function fetchExternalJobs(
  options?: ScrapeOptions,
  existingJobs: ExistingJob[] = [],
  analysisOptions?: ScrapeAnalysisOptions,
): Promise<ExternalJobResult> {
  const params = new URLSearchParams({
    limit: String(EXTERNAL_PAGE_LIMIT),
    page: "1",
  });
  if (options?.keywords) params.set("q", options.keywords);

  const rawJobs: ExternalJob[] = [];
  let page = 1;
  let sourceTotalJobs: number | null = null;
  let fetchedSourceJobs = 0;
  let totalsConsistent = true;

  while (true) {
    params.set("page", String(page));
    const res = await fetch(`${EXTERNAL_API}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`External API error ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as { jobs: ExternalJob[]; total: number };
    if (!Array.isArray(data.jobs) || !Number.isFinite(data.total) || data.total < 0) {
      throw new Error("External API returned an invalid paginated response");
    }

    if (sourceTotalJobs === null) sourceTotalJobs = data.total;
    else if (sourceTotalJobs !== data.total) totalsConsistent = false;

    if (data.jobs.length === 0) break;

    fetchedSourceJobs += data.jobs.length;
    rawJobs.push(...data.jobs.filter(isCoteDIvoireExternalJob));

    if (sourceTotalJobs !== null && fetchedSourceJobs >= sourceTotalJobs) break;
    page++;
  }

  const snapshotComplete =
    !options?.keywords &&
    !options?.location &&
    totalsConsistent &&
    sourceTotalJobs !== null &&
    sourceTotalJobs > 0 &&
    fetchedSourceJobs >= sourceTotalJobs;

  const jobsWithRecoveredDescriptions = await recoverMissingLinkedInDescriptions(rawJobs);
  const uniqueJobs = deduplicateExternalJobs(jobsWithRecoveredDescriptions);
  const existingByIdentity = new Map(existingJobs.map((job) => [jobIdentity(job), job]));
  const analysesByIdentity = new Map<string, EnrichedJobFields>();
  const jobsToAnalyze: { title: string; description: string; identity: string }[] = [];
  const analysisRequestsByFingerprint = new Map<string, { title: string; description: string; identity: string }>();
  let persistedAnalysisHits = 0;
  let localOnlyJobs = 0;

  for (const externalJob of uniqueJobs) {
    const identity = jobIdentity(externalJob);
    const existing = existingByIdentity.get(identity);
    const description =
      hasUnavailableDescription(externalJob.description) && existing && !hasUnavailableDescription(existing.description)
        ? existing.description
        : externalJob.description;
    const candidate = { ...externalJob, description };

    if (existing && hasSameAnalysisInput(candidate, existing)) {
      analysesByIdentity.set(identity, analysisFromJob(existing));
      persistedAnalysisHits++;
      continue;
    }

    if (hasUnavailableDescription(description)) {
      localOnlyJobs++;
      analysesByIdentity.set(identity, {
        skills: externalJob.skills ?? [],
        experienceYears: externalJob.experienceYears ?? null,
        diplomaRequired: externalJob.diplomaRequired ?? null,
      });
      continue;
    }

    const request = {
      title: candidate.title,
      description: candidate.description,
      identity,
    };
    const fingerprint = analysisFingerprint(request);
    if (!analysisRequestsByFingerprint.has(fingerprint)) {
      analysisRequestsByFingerprint.set(fingerprint, request);
      jobsToAnalyze.push(request);
    }
  }

  const analysisBatch = await analyzeJobsWithClaude(jobsToAnalyze, 5, analysisOptions?.requestTimeoutMs);
  const analysisByFingerprint = new Map<string, EnrichedJobFields>();
  for (let index = 0; index < jobsToAnalyze.length; index++) {
    const request = jobsToAnalyze[index];
    analysisByFingerprint.set(analysisFingerprint(request), analysisBatch.results[index]);
  }

  for (const externalJob of uniqueJobs) {
    const identity = jobIdentity(externalJob);
    if (analysesByIdentity.has(identity)) continue;
    const existing = existingByIdentity.get(identity);
    const description =
      hasUnavailableDescription(externalJob.description) && existing && !hasUnavailableDescription(existing.description)
        ? existing.description
        : externalJob.description;
    const analysis = analysisByFingerprint.get(analysisFingerprint({
      title: externalJob.title,
      description,
    }));
    if (analysis) analysesByIdentity.set(identity, analysis);
  }

  const optimization: ScrapeOptimizationStats = {
    fetchedJobs: rawJobs.length,
    uniqueJobs: uniqueJobs.length,
    duplicateJobs: rawJobs.length - uniqueJobs.length,
    persistedAnalysisHits,
    localOnlyJobs,
    analysisCacheHits: analysisBatch.stats.cacheHits,
    analysisRequests: analysisBatch.stats.uniqueRequests,
    claudeCalls: analysisBatch.stats.claudeCalls,
    fallbackJobs: analysisBatch.stats.fallbackJobs,
    circuitOpened: analysisBatch.stats.circuitOpened,
  };
  logger.info(optimization, "Job analysis optimization completed");

  const allJobs: Omit<InsertJob, "scrapedAt">[] = [];
  const seenDedupeKeys = new Set<string>();

  for (const originalJob of uniqueJobs) {
    const identity = jobIdentity(originalJob);
    const existing = existingByIdentity.get(identity);
    const j = {
      ...originalJob,
      description:
        hasUnavailableDescription(originalJob.description) && existing && !hasUnavailableDescription(existing.description)
          ? existing.description
          : originalJob.description,
    };
    const analysis = analysesByIdentity.get(identity) ?? {
      skills: j.skills ?? [],
      experienceYears: j.experienceYears ?? null,
      diplomaRequired: j.diplomaRequired ?? null,
    };
    const parsedDescription = enrichJobFromDescription({
      description: j.description,
      skills: j.skills ?? [],
      experienceYears: j.experienceYears,
      diplomaRequired: j.diplomaRequired,
    });

    const mappedJob: Omit<InsertJob, "scrapedAt"> = {
      title: j.title,
      company: j.company,
      logoUrl: normalizeLogoUrl(j.logoUrl),
      description: j.description,
      location: j.location,
      remote: j.remote ?? false,
      skills: Array.from(new Map(
        [...analysis.skills, ...parsedDescription.skills]
          .filter((skill) => skill.trim().length > 1)
          .map((skill) => [skill.toLowerCase(), skill]),
      ).values()),
      jobType: normalizeJobType(j.jobType),
      salaryMin: j.salaryMin ?? null,
      salaryMax: j.salaryMax ?? null,
      source: j.source,
      sourceUrl: normalizeJobSourceUrl(j.sourceUrl),
      dedupeKey: jobDedupeKey(j),
      country: canonicalJobCountry(j.country),
      postedAt: j.postedAt ?? null,
      experienceYears: normalizeExperienceYears(
        analysis.experienceYears ?? parsedDescription.experienceYears,
      ),
      sector: j.sector ?? null,
      diplomaRequired: analysis.diplomaRequired ?? parsedDescription.diplomaRequired,
    };
    allJobs.push(mappedJob);
    seenDedupeKeys.add(mappedJob.dedupeKey);
  }

  return {
    jobs: allJobs,
    seenDedupeKeys,
    snapshotComplete,
    sourceTotalJobs: sourceTotalJobs ?? 0,
    fetchedSourceJobs,
    optimization,
  };
}

function normalizeJobType(raw: string): string {
  const t = (raw ?? "").toLowerCase();
  if (t.includes("cdi")) return "CDI";
  if (t.includes("cdd")) return "CDD";
  if (t.includes("stage") || t.includes("intern")) return "Stage";
  if (t.includes("altern")) return "Alternance";
  if (t.includes("free") || t.includes("consul")) return "Freelance";
  return raw || "CDI";
}
