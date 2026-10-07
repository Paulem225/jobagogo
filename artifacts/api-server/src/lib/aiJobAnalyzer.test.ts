import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL = "https://anthropic.test";
process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY = "test-key";

const { analyzeJobsWithClaude } = await import("./aiJobAnalyzer");
const { fetchExternalJobs } = await import("./scraper");

type JobInput = { title: string; description: string };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function claudeResponse(): Response {
  return jsonResponse({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          skills: ["TypeScript"],
          diploma: "Bac+3",
          experienceYears: 2,
        }),
      },
    ],
  });
}

function setFetch(handler: (url: string) => Response | Promise<Response>): void {
  globalThis.fetch = (async (input: string | URL | Request) => handler(String(input))) as typeof fetch;
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error("Condition was not met before timeout");
}

test("une offre inchangée réutilise son analyse sans nouvel appel Anthropic", async () => {
  const job: JobInput = {
    title: "Développeur cache test",
    description: "Offre inchangée à analyser avec TypeScript.",
  };
  let anthropicCalls = 0;

  setFetch((url) => {
    assert.equal(url, "https://anthropic.test/messages");
    anthropicCalls++;
    return claudeResponse();
  });

  const first = await analyzeJobsWithClaude([job], 1);
  const second = await analyzeJobsWithClaude([job], 1);

  assert.equal(first.stats.claudeCalls, 1);
  assert.equal(second.stats.claudeCalls, 0);
  assert.equal(second.stats.cacheHits, 1);
  assert.deepEqual(second.results[0], first.results[0]);
  assert.equal(anthropicCalls, 1);
});

test("deux offres identiques ne déclenchent qu'une seule analyse", async () => {
  const job: JobInput = {
    title: "Développeur dédoublonnage test",
    description: "Offre identique à analyser avec React.",
  };
  let anthropicCalls = 0;

  setFetch((url) => {
    assert.equal(url, "https://anthropic.test/messages");
    anthropicCalls++;
    return claudeResponse();
  });

  const batch = await analyzeJobsWithClaude([job, { ...job }], 2);

  assert.equal(batch.stats.requestedJobs, 2);
  assert.equal(batch.stats.uniqueRequests, 1);
  assert.equal(batch.stats.claudeCalls, 1);
  assert.equal(anthropicCalls, 1);
  assert.deepEqual(batch.results[0], batch.results[1]);
});

test("un 429 ouvre le circuit et conserve l'enrichissement local", async () => {
  const jobs: JobInput[] = [
    {
      title: "Développeur limité test",
      description: "TypeScript requis, au moins 3 ans d'expérience, diplôme Bac+3.",
    },
    {
      title: "Développeur après limite test",
      description: "React requis, au moins 2 ans d'expérience, diplôme Bac+2.",
    },
    {
      title: "Développeur troisième test",
      description: "Python requis, au moins 1 an d'expérience, diplôme Bac+3.",
    },
  ];
  let anthropicCalls = 0;

  setFetch((url) => {
    assert.equal(url, "https://anthropic.test/messages");
    anthropicCalls++;
    return jsonResponse({ error: "rate limited" }, 429);
  });

  const batch = await analyzeJobsWithClaude(jobs, 1);

  assert.equal(anthropicCalls, 1);
  assert.equal(batch.stats.claudeCalls, 1);
  assert.equal(batch.stats.circuitOpened, true);
  assert.equal(batch.stats.fallbackJobs, jobs.length);
  assert.equal(batch.results[0].skills.includes("TypeScript"), true);
  assert.equal(batch.results[0].experienceYears, 3);
  assert.equal(batch.results[0].diplomaRequired, "Bac+3");
  assert.equal(batch.results[1].skills.includes("React"), true);
  assert.equal(batch.results[2].skills.includes("Python"), true);
});

test("un 429 parmi des analyses concurrentes ne démarre pas la vague suivante", async () => {
  const jobs: JobInput[] = [
    {
      title: "Développeur concurrent limité test",
      description: "TypeScript requis, au moins 3 ans d'expérience, diplôme Bac+3.",
    },
    {
      title: "Développeur concurrent deux test",
      description: "React requis, au moins 2 ans d'expérience, diplôme Bac+2.",
    },
    {
      title: "Développeur concurrent trois test",
      description: "Python requis, au moins 1 an d'expérience, diplôme Bac+3.",
    },
    {
      title: "Développeur concurrent quatre test",
      description: "Java requis, au moins 4 ans d'expérience, diplôme Bac+5.",
    },
    {
      title: "Développeur concurrent cinq test",
      description: "Go requis, au moins 5 ans d'expérience, diplôme Bac+3.",
    },
  ];
  let anthropicCalls = 0;
  const pendingResponses: ((response: Response) => void)[] = [];

  setFetch((url) => {
    assert.equal(url, "https://anthropic.test/messages");
    anthropicCalls++;
    return new Promise<Response>((resolve) => pendingResponses.push(resolve));
  });

  const batchPromise = analyzeJobsWithClaude(jobs, 3);
  await waitFor(() => pendingResponses.length === 3);

  pendingResponses[0](jsonResponse({ error: "rate limited" }, 429));
  pendingResponses[1](claudeResponse());
  pendingResponses[2](claudeResponse());

  const batch = await batchPromise;

  assert.equal(anthropicCalls, 3);
  assert.equal(batch.stats.claudeCalls, 3);
  assert.equal(batch.stats.circuitOpened, true);
  assert.equal(batch.stats.fallbackJobs, 3);
  assert.equal(batch.results[0].skills.includes("TypeScript"), true);
  assert.equal(batch.results[0].experienceYears, 3);
  assert.deepEqual(batch.results[1].skills, ["TypeScript"]);
  assert.equal(batch.results[1].experienceYears, 2);
  assert.equal(batch.results[2].diplomaRequired, "Bac+3");
  assert.equal(batch.results[3].skills.includes("Java"), true);
  assert.equal(batch.results[3].experienceYears, 4);
  assert.equal(batch.results[3].diplomaRequired, "Bac+5");
  assert.equal(batch.results[4].skills.includes("Go"), true);
  assert.equal(batch.results[4].experienceYears, 5);
  assert.equal(batch.results[4].diplomaRequired, "Bac+3");
});

test("un appel Anthropic bloqué expire, utilise le local et ne lance pas de nouvelle vague", async () => {
  const jobs: JobInput[] = [
    {
      title: "Développeur timeout test",
      description: "TypeScript requis, au moins 3 ans d'expérience, diplôme Bac+3.",
    },
    {
      title: "Développeur après timeout test",
      description: "React requis, au moins 2 ans d'expérience, diplôme Bac+2.",
    },
    {
      title: "Développeur troisième timeout test",
      description: "Python requis, au moins 1 an d'expérience, diplôme Bac+3.",
    },
  ];
  let anthropicCalls = 0;

  setFetch((url) => {
    assert.equal(url, "https://anthropic.test/messages");
    anthropicCalls++;
    return new Promise<Response>(() => {});
  });

  const batch = await analyzeJobsWithClaude(jobs, 1, 10);

  assert.equal(anthropicCalls, 1);
  assert.equal(batch.stats.claudeCalls, 1);
  assert.equal(batch.stats.circuitOpened, true);
  assert.equal(batch.stats.fallbackJobs, jobs.length);
  assert.equal(batch.results[0].skills.includes("TypeScript"), true);
  assert.equal(batch.results[0].experienceYears, 3);
  assert.equal(batch.results[1].skills.includes("React"), true);
  assert.equal(batch.results[2].skills.includes("Python"), true);
});

test("le scraper termine avec des métriques de fallback après un timeout Anthropic", async () => {
  const externalJobs = [
    {
      id: 902,
      title: "Offre scraper timeout une",
      company: "Entreprise timeout",
      logoUrl: null,
      description: "TypeScript requis, au moins 3 ans d'expérience, diplôme Bac+3.",
      location: "Abidjan",
      remote: false,
      skills: [],
      jobType: "CDI",
      salaryMin: null,
      salaryMax: null,
      source: "source-test",
      sourceUrl: "https://jobs.test/902",
      country: "Côte d'Ivoire",
      postedAt: null,
      experienceYears: null,
      sector: null,
      diplomaRequired: null,
    },
    {
      id: 903,
      title: "Offre scraper timeout deux",
      company: "Entreprise timeout",
      logoUrl: null,
      description: "React requis, au moins 2 ans d'expérience, diplôme Bac+2.",
      location: "Abidjan",
      remote: false,
      skills: [],
      jobType: "CDI",
      salaryMin: null,
      salaryMax: null,
      source: "source-test",
      sourceUrl: "https://jobs.test/903",
      country: "Côte d'Ivoire",
      postedAt: null,
      experienceYears: null,
      sector: null,
      diplomaRequired: null,
    },
  ];
  let anthropicCalls = 0;

  setFetch((url) => {
    if (url === "https://node-type-script-build.replit.app/api/jobs?limit=200&page=1") {
      return jsonResponse({ jobs: externalJobs, total: externalJobs.length });
    }
    assert.equal(url, "https://anthropic.test/messages");
    anthropicCalls++;
    return new Promise<Response>(() => {});
  });

  const result = await fetchExternalJobs(undefined, [], { requestTimeoutMs: 10 });

  assert.equal(anthropicCalls, externalJobs.length);
  assert.equal(result.optimization.analysisRequests, externalJobs.length);
  assert.equal(result.optimization.claudeCalls, externalJobs.length);
  assert.equal(result.optimization.fallbackJobs, externalJobs.length);
  assert.equal(result.optimization.circuitOpened, true);
  assert.equal(result.jobs.length, externalJobs.length);
  assert.equal(result.jobs[0].country, "Côte d'Ivoire");
});

test("le scraper réutilise l'analyse persistée d'une offre inchangée", async () => {
  const externalJob = {
    id: 901,
    title: "Offre persistée inchangée test",
    company: "Entreprise test",
    logoUrl: null,
    description: "Description persistée inchangée.",
    location: "Abidjan",
    remote: false,
    skills: [],
    jobType: "CDI",
    salaryMin: null,
    salaryMax: null,
    source: "source-test",
    sourceUrl: "https://jobs.test/901",
    country: "Côte d'Ivoire",
    postedAt: null,
    experienceYears: null,
    sector: null,
    diplomaRequired: null,
  };
  const persistedAnalysis = {
    skills: ["TypeScript"],
    experienceYears: 4,
    diplomaRequired: "Bac+3",
  };
  let anthropicCalls = 0;

  setFetch((url) => {
    if (url === "https://node-type-script-build.replit.app/api/jobs?limit=200&page=1") {
      return jsonResponse({ jobs: [externalJob], total: 1 });
    }
    anthropicCalls++;
    return claudeResponse();
  });

  const result = await fetchExternalJobs(undefined, [
    {
      ...externalJob,
      dedupeKey: "url:https://jobs.test/901",
      ...persistedAnalysis,
    },
  ]);

  assert.equal(anthropicCalls, 0);
  assert.equal(result.optimization.persistedAnalysisHits, 1);
  assert.equal(result.optimization.analysisRequests, 0);
  assert.equal(result.optimization.claudeCalls, 0);
  assert.deepEqual(result.jobs[0].skills, ["TypeScript"]);
  assert.equal(result.jobs[0].country, "Côte d'Ivoire");
  assert.equal(result.jobs[0].experienceYears, 4);
  assert.equal(result.jobs[0].diplomaRequired, "Bac+3");
});