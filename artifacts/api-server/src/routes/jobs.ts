import { Router, type IRouter } from "express";
import { eq, sql, ilike, and, inArray, type SQL } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import { fetchExternalJobs, recoverDescriptionFromSource } from "../lib/scraper";
import { enrichJobFromDescription } from "../lib/jobDescriptionParser";
import { logger } from "../lib/logger";
import { notifyProfilesForNewJobs } from "../lib/pushNotifications";
import { requireAuth } from "../middleware/auth";
import { getJobCategory, JOB_CATEGORIES } from "@workspace/job-categories";
import { coteDIvoireJobCondition } from "../lib/jobCountry";
import { diversifyJobsByCompany } from "../lib/jobFeedOrder";
import { planMissingJobRemovals } from "../lib/jobReconciliation";
import { withScraperLock } from "../lib/scraperLock";

const router: IRouter = Router();
router.use("/jobs", requireAuth);

function jobToJson(job: typeof jobsTable.$inferSelect) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    logoUrl: job.logoUrl,
    description: job.description,
    location: job.location,
    remote: job.remote,
    skills: job.skills,
    jobType: job.jobType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    source: job.source,
    sourceUrl: job.sourceUrl,
    country: job.country,
    postedAt: job.postedAt,
    experienceYears: job.experienceYears,
    sector: job.sector,
    diplomaRequired: job.diplomaRequired,
    scrapedAt: job.scrapedAt.toISOString(),
  };
}

function buildPublicJobSummary(job: typeof jobsTable.$inferSelect): string {
  const sectorText = job.sector ? ` dans le secteur ${job.sector}` : "";
  const remoteText = job.remote ? " avec une possibilité de travail à distance" : "";
  const skillText = job.skills.slice(0, 3).join(", ");
  const skillsText = skillText ? ` Les compétences mises en avant sont ${skillText}.` : "";
  return `Une opportunité ${job.jobType.toLowerCase()} est disponible à ${job.location}${sectorText}${remoteText} pour un poste de ${job.title}.${skillsText}`;
}

function publicJobToJson(job: typeof jobsTable.$inferSelect) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    logoUrl: job.logoUrl,
    location: job.location,
    remote: job.remote,
    skills: job.skills.slice(0, 5),
    jobType: job.jobType,
    source: job.source,
    country: job.country,
    postedAt: job.postedAt,
    scrapedAt: job.scrapedAt.toISOString(),
    sector: job.sector,
    experienceYears: job.experienceYears,
    summary: buildPublicJobSummary(job),
    isVerified: Boolean(job.source && job.scrapedAt),
  };
}

router.get("/jobs", async (req, res): Promise<void> => {
  const { jobType, location, search, category } = req.query as Record<string, string>;
  const requestedLimit = parseInt(req.query["limit"] as string ?? "50", 10);
  const requestedOffset = parseInt(req.query["offset"] as string ?? "0", 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50;
  const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;

  if (category && !JOB_CATEGORIES.includes(category as (typeof JOB_CATEGORIES)[number])) {
    res.status(400).json({ error: "Invalid job category" });
    return;
  }

  const conditions: SQL[] = [coteDIvoireJobCondition()];
  if (jobType) conditions.push(eq(jobsTable.jobType, jobType));
  if (location) conditions.push(ilike(jobsTable.location, `%${location}%`));
  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      sql`(
        ${jobsTable.title} ilike ${searchPattern}
        or ${jobsTable.company} ilike ${searchPattern}
        or ${jobsTable.description} ilike ${searchPattern}
        or ${jobsTable.location} ilike ${searchPattern}
        or ${jobsTable.skills}::text ilike ${searchPattern}
        or ${jobsTable.jobType} ilike ${searchPattern}
        or ${jobsTable.source} ilike ${searchPattern}
        or ${jobsTable.sourceUrl} ilike ${searchPattern}
        or ${jobsTable.postedAt} ilike ${searchPattern}
        or ${jobsTable.sector} ilike ${searchPattern}
        or ${jobsTable.diplomaRequired} ilike ${searchPattern}
        or ${jobsTable.experienceYears}::text ilike ${searchPattern}
        or ${jobsTable.salaryMin}::text ilike ${searchPattern}
        or ${jobsTable.salaryMax}::text ilike ${searchPattern}
      )`,
    );
  }

  const baseQuery = db
    .select()
    .from(jobsTable)
    .orderBy(
      sql`${jobsTable.postedAt} desc nulls last, ${jobsTable.scrapedAt} desc, ${jobsTable.id} desc`,
    );

  const matchingJobs = conditions.length > 0
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;
  const categoryJobs = category
    ? matchingJobs.filter((job) => getJobCategory(job) === category)
    : matchingJobs;
  const jobs = diversifyJobsByCompany(categoryJobs).slice(offset, offset + limit);

  res.json(jobs.map(jobToJson));
});

router.get("/public/jobs/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const [job] = await db
    .select()
    .from(jobsTable)
    .where(and(eq(jobsTable.id, id), coteDIvoireJobCondition()))
    .limit(1);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=900");
  res.json(publicJobToJson(job));
});

type ManualScrapeResponse = {
  status: 200 | 502;
  body: Record<string, unknown>;
};

async function runManualScrape(options: {
  keywords?: string;
  location?: string;
}): Promise<ManualScrapeResponse> {
  const { keywords, location } = options;
  let result;
  try {
    const existingJobs = await db.select().from(jobsTable);
    result = await fetchExternalJobs({ keywords, location }, existingJobs);
  } catch (err) {
    return {
      status: 502,
      body: { error: "Impossible de joindre l'API externe de scraping" },
    };
  }

  const {
    jobs: externalJobs,
    seenDedupeKeys,
    snapshotComplete,
    sourceTotalJobs,
    fetchedSourceJobs,
  } = result;

  let added = 0;
  let updated = 0;
  let removed = 0;
  let failed = 0;
  const newJobs: typeof jobsTable.$inferSelect[] = [];

  for (const job of externalJobs) {
    try {
      const existing = await db
        .select()
        .from(jobsTable)
        .where(eq(jobsTable.dedupeKey, job.dedupeKey))
        .limit(1);

      if (existing.length > 0) {
        const existingJob = existing[0];
        const updatePayload = {
          ...job,
          // Never replace a recovered description with a placeholder from
          // the external API.
          description:
            hasUnavailableDescription(job.description) &&
            !hasUnavailableDescription(existingJob.description)
              ? existingJob.description
              : job.description,
          skills: (job.skills ?? []).length > 0 ? job.skills : existingJob.skills,
          experienceYears: job.experienceYears ?? existingJob.experienceYears,
          diplomaRequired: job.diplomaRequired ?? existingJob.diplomaRequired,
        };
        await db
          .update(jobsTable)
          .set({ ...updatePayload, scrapedAt: new Date() })
          .where(eq(jobsTable.id, existing[0].id));
        updated++;
      } else {
        const [inserted] = await db.insert(jobsTable).values({ ...job, scrapedAt: new Date() }).returning();
        newJobs.push(inserted);
        added++;
      }
    } catch (err) {
      failed++;
      logger.warn({ err, sourceUrl: job.sourceUrl, title: job.title }, "Skipping invalid external job");
    }
  }

  // Remove local jobs that are no longer present in the external API response
  const allLocalJobs = await db
    .select({ id: jobsTable.id, dedupeKey: jobsTable.dedupeKey })
    .from(jobsTable)
    .where(coteDIvoireJobCondition());
  const removalPlan = planMissingJobRemovals(
    allLocalJobs,
    seenDedupeKeys,
    snapshotComplete,
  );
  const idsToRemove = removalPlan.ids;

  if (idsToRemove.length > 0) {
    await db.delete(jobsTable).where(inArray(jobsTable.id, idsToRemove));
    removed = idsToRemove.length;
  } else if (removalPlan.skippedReason) {
    logger.warn(
      {
        reason: removalPlan.skippedReason,
        localJobs: allLocalJobs.length,
        sourceTotalJobs,
        fetchedSourceJobs,
        countryJobs: externalJobs.length,
      },
      "Skipped automatic job removal",
    );
  }

  await notifyProfilesForNewJobs(newJobs);
  return {
    status: 200,
    body: {
      jobsAdded: added,
      jobsUpdated: updated,
      jobsRemoved: removed,
      jobsFailed: failed,
      total: added + updated - removed,
      message: `Scraping terminé : ${added} nouvelles offres, ${updated} mises à jour, ${removed} supprimées`,
    },
  };
}

router.post("/jobs/scrape", async (req, res): Promise<void> => {
  const options = req.body as { keywords?: string; location?: string };
  const lockResult = await withScraperLock(() => runManualScrape(options));
  if (!lockResult.acquired) {
    logger.warn("Rejected manual scrape because another scrape is already running");
    res.status(409).json({
      error: "Un scraping est déjà en cours. Réessaie dans quelques instants.",
    });
    return;
  }

  res.status(lockResult.value.status).json(lockResult.value.body);
});

router.get("/jobs/stats", async (req, res): Promise<void> => {
  const totalResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jobsTable)
    .where(coteDIvoireJobCondition());

  const totalJobs = totalResult[0]?.count ?? 0;

  const sources = await db
    .select({ source: jobsTable.source })
    .from(jobsTable)
    .where(coteDIvoireJobCondition())
    .groupBy(jobsTable.source);

  const jobsForStats = await db
    .select({
      title: jobsTable.title,
      sector: jobsTable.sector,
      skills: jobsTable.skills,
      description: jobsTable.description,
    })
    .from(jobsTable)
    .where(coteDIvoireJobCondition());
  const skillCount: Record<string, number> = {};
  const categoryCount: Record<string, number> = {};
  for (const row of jobsForStats) {
    for (const skill of row.skills) {
      skillCount[skill] = (skillCount[skill] ?? 0) + 1;
    }
    const category = getJobCategory(row);
    categoryCount[category] = (categoryCount[category] ?? 0) + 1;
  }
  const topSkills = Object.entries(skillCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  const jobTypeRaw = await db
    .select({
      jobType: jobsTable.jobType,
      count: sql<number>`count(*)::int`,
    })
    .from(jobsTable)
    .where(coteDIvoireJobCondition())
    .groupBy(jobsTable.jobType)
    .orderBy(sql`count(*) desc`);

  res.json({
    totalJobs,
    totalSources: sources.length,
    avgFitScore: null,
    topSkills,
    jobTypeBreakdown: jobTypeRaw.map((r) => ({ jobType: r.jobType, count: r.count })),
    categoryBreakdown: JOB_CATEGORIES.map((category) => ({
      category,
      count: categoryCount[category] ?? 0,
    })),
  });
});

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }

  const jobs = await db
    .select()
    .from(jobsTable)
    .where(and(eq(jobsTable.id, id), coteDIvoireJobCondition()))
    .limit(1);
  if (!jobs[0]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  let job = jobs[0];
  const recoveredDescription = await recoverDescriptionFromSource(job);
  const descriptionForEnrichment = recoveredDescription ?? job.description;
  const parsedDescription = enrichJobFromDescription({
    description: descriptionForEnrichment,
    skills: job.skills,
    experienceYears: job.experienceYears,
    diplomaRequired: job.diplomaRequired,
  });
  const metadataNeedsRefresh =
    recoveredDescription !== null ||
    job.experienceYears !== parsedDescription.experienceYears ||
    job.diplomaRequired !== parsedDescription.diplomaRequired ||
    parsedDescription.skills.length !== job.skills.length;

  if (metadataNeedsRefresh) {
    const [updatedJob] = await db
      .update(jobsTable)
      .set({
        description: descriptionForEnrichment,
        skills: parsedDescription.skills,
        experienceYears: parsedDescription.experienceYears,
        diplomaRequired: parsedDescription.diplomaRequired,
      })
      .where(eq(jobsTable.id, job.id))
      .returning();
    job = updatedJob ?? { ...job, description: recoveredDescription };
    logger.info({ jobId: job.id, sourceUrl: job.sourceUrl }, "Recovered job description on detail request");
  }

  res.json(jobToJson(job));
});

function hasUnavailableDescription(description: string | null | undefined): boolean {
  const normalized = (description ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return !normalized || /^(description\s+(non\s+disponible|not available)|non disponible|n\/a|na)\.?$/i.test(normalized);
}

export default router;
