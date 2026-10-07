import { logger } from "./logger";
import { enrichJobFromDescription } from "./jobDescriptionParser";

const ANTHROPIC_BASE_URL = process.env["AI_INTEGRATIONS_ANTHROPIC_BASE_URL"];
const ANTHROPIC_API_KEY = process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"];

interface ClaudeAnalysis {
  skills: string[];
  diploma: string | null;
  experienceYears: number | null;
}

export interface EnrichedJobFields {
  skills: string[];
  experienceYears: number | null;
  diplomaRequired: string | null;
}

interface ClaudeAnalysisCacheEntry {
  analysis: EnrichedJobFields;
  expiresAt: number;
}

export interface ClaudeBatchStats {
  requestedJobs: number;
  uniqueRequests: number;
  cacheHits: number;
  claudeCalls: number;
  fallbackJobs: number;
  circuitOpened: boolean;
}

export interface ClaudeBatchResult {
  results: EnrichedJobFields[];
  stats: ClaudeBatchStats;
}

const ANALYSIS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_ANALYSIS_CACHE_ENTRIES = 5000;
const ANTHROPIC_ANALYSIS_TIMEOUT_MS = 15_000;
const analysisCache = new Map<string, ClaudeAnalysisCacheEntry>();

function analysisFingerprint(job: { title: string; description: string }): string {
  return `${job.title.trim().toLowerCase().replace(/\s+/g, " ")}\n${job.description.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

function fallbackAnalysis(description: string): EnrichedJobFields {
  return enrichJobFromDescription({
    description,
    skills: [],
    experienceYears: null,
    diplomaRequired: null,
  });
}

function getCachedAnalysis(fingerprint: string): EnrichedJobFields | null {
  const cached = analysisCache.get(fingerprint);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    analysisCache.delete(fingerprint);
    return null;
  }
  return cached.analysis;
}

function cacheAnalysis(fingerprint: string, analysis: EnrichedJobFields): void {
  if (analysisCache.size >= MAX_ANALYSIS_CACHE_ENTRIES) {
    for (const [cachedFingerprint, cached] of analysisCache) {
      if (cached.expiresAt <= Date.now()) analysisCache.delete(cachedFingerprint);
    }
  }
  while (analysisCache.size >= MAX_ANALYSIS_CACHE_ENTRIES) {
    const oldestFingerprint = analysisCache.keys().next().value;
    if (!oldestFingerprint) break;
    analysisCache.delete(oldestFingerprint);
  }
  analysisCache.set(fingerprint, {
    analysis,
    expiresAt: Date.now() + ANALYSIS_CACHE_TTL_MS,
  });
}

class ClaudeHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ClaudeHttpError";
  }
}

class ClaudeTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Claude API request timed out after ${timeoutMs}ms`);
    this.name = "ClaudeTimeoutError";
  }
}

function isTemporaryClaudeError(error: unknown): boolean {
  if (error instanceof ClaudeHttpError) {
    return error.status === 429 || error.status >= 500;
  }
  return error instanceof ClaudeTimeoutError || error instanceof TypeError;
}

async function withClaudeTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort();
      reject(new ClaudeTimeoutError(timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

const SYSTEM_PROMPT = `Tu es un assistant qui analyse des offres d'emploi pour une application de matching en Côte d'Ivoire.

Pour chaque offre, extrais :
1. Les compétences techniques et soft skills pertinentes (liste de chaînes)
2. Le diplôme minimum requis (ex: Bac, Bac+2, Bac+3, Bac+5, Master, etc.)
3. Les années d'expérience minimum requises (nombre entier, ou 0 si pas d'expérience requise)

Réponds UNIQUEMENT au format JSON suivant, sans markdown ni autre texte :
{
  "skills": ["compétence1", "compétence2"],
  "diploma": "Bac+3",
  "experienceYears": 2
}

Si une information est absente, utilise null. Si le poste est un stage ou une alternance sans expérience requise, utilise 0 pour experienceYears.`;

async function analyzeJobWithClaudeDetailed(job: {
  title: string;
  description: string;
}, requestTimeoutMs = ANTHROPIC_ANALYSIS_TIMEOUT_MS): Promise<{
  analysis: EnrichedJobFields;
  temporaryFailure: boolean;
  usedFallback: boolean;
}> {
  if (!ANTHROPIC_BASE_URL || !ANTHROPIC_API_KEY) {
    logger.warn("Anthropic env vars missing, falling back to keyword extraction");
    return { analysis: fallbackAnalysis(job.description), temporaryFailure: false, usedFallback: true };
  }

  const userPrompt = `Titre : ${job.title}\n\nDescription : ${job.description.slice(0, 1800)}\n\nExtrais les compétences, le diplôme et l'expérience au format JSON demandé.`;

  try {
    const data = await withClaudeTimeout(async (signal) => {
      const res = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new ClaudeHttpError(`Claude API error ${res.status}: ${body.slice(0, 200)}`, res.status);
      }

      return (await res.json()) as {
        content?: { type: string; text: string }[];
        usage?: { input_tokens: number; output_tokens: number };
      };
    }, requestTimeoutMs);

    const text = data.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as ClaudeAnalysis) : null;

    if (!parsed) {
      throw new Error("Claude returned no valid JSON");
    }

    return {
      analysis: {
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        experienceYears: typeof parsed.experienceYears === "number" ? parsed.experienceYears : null,
        diplomaRequired: parsed.diploma || null,
      },
      temporaryFailure: false,
      usedFallback: false,
    };
  } catch (err) {
    logger.warn({ err, title: job.title }, "Claude analysis failed, falling back to keyword extraction");
    return {
      analysis: fallbackAnalysis(job.description),
      temporaryFailure: isTemporaryClaudeError(err),
      usedFallback: true,
    };
  }
}

export async function analyzeJobWithClaude(job: {
  title: string;
  description: string;
}, requestTimeoutMs = ANTHROPIC_ANALYSIS_TIMEOUT_MS): Promise<EnrichedJobFields> {
  const fingerprint = analysisFingerprint(job);
  const cached = getCachedAnalysis(fingerprint);
  if (cached) return cached;

  const { analysis } = await analyzeJobWithClaudeDetailed(job, requestTimeoutMs);
  cacheAnalysis(fingerprint, analysis);
  return analysis;
}

/**
 * Analyze a batch of jobs with Claude, with concurrency limit to avoid rate limits.
 * Reuses recent in-memory results, deduplicates identical inputs, and stops
 * starting new requests after a temporary provider failure.
 */
export async function analyzeJobsWithClaude<T extends { title: string; description: string }>(
  jobs: T[],
  concurrency = 5,
  requestTimeoutMs = ANTHROPIC_ANALYSIS_TIMEOUT_MS,
): Promise<ClaudeBatchResult> {
  const results = new Array<EnrichedJobFields>(jobs.length);
  const groups = new Map<string, { job: T; indexes: number[] }>();

  for (let index = 0; index < jobs.length; index++) {
    const job = jobs[index];
    const fingerprint = analysisFingerprint(job);
    const group = groups.get(fingerprint);
    if (group) {
      group.indexes.push(index);
    } else {
      groups.set(fingerprint, { job, indexes: [index] });
    }
  }

  const stats: ClaudeBatchStats = {
    requestedJobs: jobs.length,
    uniqueRequests: groups.size,
    cacheHits: 0,
    claudeCalls: 0,
    fallbackJobs: 0,
    circuitOpened: false,
  };
  const pending: { fingerprint: string; job: T; indexes: number[] }[] = [];

  for (const [fingerprint, group] of groups) {
    const cached = getCachedAnalysis(fingerprint);
    if (cached) {
      for (const index of group.indexes) results[index] = cached;
      stats.cacheHits += group.indexes.length;
    } else {
      pending.push({ fingerprint, ...group });
    }
  }

  const concurrencyLimit =
    Number.isFinite(concurrency) && concurrency > 0 ? Math.max(1, Math.floor(concurrency)) : 1;
  let circuitOpen = false;

  function assignResult(indexes: number[], result: EnrichedJobFields): void {
    for (const index of indexes) results[index] = result;
  }

  async function processWave(
    wave: { fingerprint: string; job: T; indexes: number[] }[],
  ): Promise<void> {
    const analyzed = await Promise.all(
      wave.map(async (item) => {
        stats.claudeCalls++;
        const detailed = await analyzeJobWithClaudeDetailed(item.job, requestTimeoutMs);
        return { item, ...detailed };
      }),
    );

    for (const { item, analysis, temporaryFailure, usedFallback } of analyzed) {
      cacheAnalysis(item.fingerprint, analysis);
      assignResult(item.indexes, analysis);
      if (usedFallback) stats.fallbackJobs += item.indexes.length;
      if (temporaryFailure) {
        circuitOpen = true;
        stats.circuitOpened = true;
      }
    }
  }

  for (
    let offset = 0;
    offset < pending.length && !circuitOpen;
    offset += concurrencyLimit
  ) {
    const wave = pending.slice(offset, offset + concurrencyLimit);
    await processWave(wave);
  }

  for (const item of pending) {
    if (!item.indexes.every((index) => results[index])) {
      const fallback = fallbackAnalysis(item.job.description);
      assignResult(item.indexes, fallback);
      stats.fallbackJobs += item.indexes.length;
    }
  }

  return { results, stats };
}
