import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, profilesTable, jobsTable } from "@workspace/db";
import { compareMatchResults, computeMatchScore } from "../lib/matching";
import { requireAuth } from "../middleware/auth";
import { coteDIvoireJobCondition } from "../lib/jobCountry";

const router: IRouter = Router();
router.use("/matches", requireAuth);

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
    scrapedAt: job.scrapedAt.toISOString(),
  };
}

router.get("/matches", async (req, res): Promise<void> => {
  const requestedMinScore = parseInt((req.query["minScore"] as string) ?? "0", 10);
  const minScore = Number.isFinite(requestedMinScore)
    ? Math.min(Math.max(requestedMinScore, 0), 100)
    : 0;
  const requestedLimit = parseInt((req.query["limit"] as string) ?? "50", 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 200)
    : 50;
  const rawJobId = req.query["jobId"] as string | undefined;
  const jobId = rawJobId === undefined ? undefined : parseInt(rawJobId, 10);
  if (
    rawJobId !== undefined &&
    (jobId === undefined || !Number.isInteger(jobId) || jobId < 1)
  ) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }

  const profiles = await db.select().from(profilesTable)
    .where(eq(profilesTable.id, req.auth!.profileId))
    .limit(1);
  if (!profiles[0]) {
    res.status(404).json({ error: "No profile found. Please create a profile first." });
    return;
  }
  const profile = profiles[0];

  const jobsQuery = db
    .select()
    .from(jobsTable)
    .orderBy(
      sql`${jobsTable.postedAt} desc nulls last, ${jobsTable.scrapedAt} desc, ${jobsTable.id} desc`,
    );
  const jobs = jobId === undefined
    ? await jobsQuery.where(coteDIvoireJobCondition())
    : await jobsQuery.where(and(eq(jobsTable.id, jobId), coteDIvoireJobCondition()));

  const matches = jobs
    .map((job) => {
      const scores = computeMatchScore(profile, job);
      return {
        job: jobToJson(job),
        ...scores,
      };
    })
    .filter((m) => m.fitScore >= minScore)
    .sort(compareMatchResults)
    .slice(0, limit);

  res.json(matches);
});

export default router;
