import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, savedJobsTable, jobsTable } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { coteDIvoireJobCondition } from "../lib/jobCountry";

const router: IRouter = Router();
router.use("/saved", requireAuth);

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

router.get("/saved", async (req, res): Promise<void> => {
  const saved = await db
    .select({
      id: savedJobsTable.id,
      jobId: savedJobsTable.jobId,
      savedAt: savedJobsTable.savedAt,
      job: jobsTable,
    })
    .from(savedJobsTable)
    .leftJoin(jobsTable, eq(savedJobsTable.jobId, jobsTable.id))
    .where(and(eq(savedJobsTable.profileId, req.auth!.profileId), coteDIvoireJobCondition()))
    .orderBy(
      sql`${jobsTable.postedAt} desc nulls last, ${jobsTable.scrapedAt} desc, ${jobsTable.id} desc`,
    );

  res.json(
    saved
      .filter((s) => s.job !== null)
      .map((s) => ({
        id: s.id,
        jobId: s.jobId,
        savedAt: s.savedAt.toISOString(),
        job: jobToJson(s.job!),
      }))
  );
});

router.post("/saved", async (req, res): Promise<void> => {
  const { jobId } = req.body as { jobId?: number };
  if (!jobId || typeof jobId !== "number") {
    res.status(400).json({ error: "jobId is required" });
    return;
  }

  const job = await db
    .select()
    .from(jobsTable)
    .where(and(eq(jobsTable.id, jobId), coteDIvoireJobCondition()))
    .limit(1);
  if (!job[0]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const existing = await db
    .select()
    .from(savedJobsTable)
    .where(and(
      eq(savedJobsTable.profileId, req.auth!.profileId),
      eq(savedJobsTable.jobId, jobId),
    ))
    .limit(1);

  if (existing[0]) {
    res.status(201).json({
      id: existing[0].id,
      jobId: existing[0].jobId,
      savedAt: existing[0].savedAt.toISOString(),
    });
    return;
  }

  const inserted = await db
    .insert(savedJobsTable)
    .values({ profileId: req.auth!.profileId, jobId })
    .returning();

  res.status(201).json({
    id: inserted[0].id,
    jobId: inserted[0].jobId,
    savedAt: inserted[0].savedAt.toISOString(),
  });
});

router.delete("/saved/:jobId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params["jobId"]) ? req.params["jobId"][0] : req.params["jobId"];
  const jobId = parseInt(rawId, 10);
  if (isNaN(jobId)) {
    res.status(400).json({ error: "Invalid jobId" });
    return;
  }

  await db.delete(savedJobsTable).where(and(
    eq(savedJobsTable.profileId, req.auth!.profileId),
    eq(savedJobsTable.jobId, jobId),
  ));
  res.sendStatus(204);
});

export default router;
