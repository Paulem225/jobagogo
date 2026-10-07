import cron from "node-cron";
import { logger } from "./logger";
import { fetchExternalJobs } from "./scraper";
import { db, jobsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { notifyProfilesForNewJobs } from "./pushNotifications";
import { coteDIvoireJobCondition } from "./jobCountry";
import { planMissingJobRemovals } from "./jobReconciliation";
import { withScraperLock } from "./scraperLock";

/**
 * Scrape external jobs every 15 minutes and upsert them into the local DB.
 * Deduplicates by sourceUrl when available, otherwise by title + company.
 * Removes local jobs that are no longer returned by the external API.
 */
export async function runScheduledScrape(): Promise<void> {
  const lockResult = await withScraperLock(runScheduledScrapeUnlocked);
  if (!lockResult.acquired) {
    logger.warn("Skipped scheduled scrape because another scrape is already running");
  }
}

async function runScheduledScrapeUnlocked(): Promise<void> {
  logger.info("Starting scheduled scrape from external job API");

  let result;
  try {
    const existingJobs = await db.select().from(jobsTable);
    result = await fetchExternalJobs(undefined, existingJobs);
  } catch (err) {
    logger.error({ err }, "Scheduled scrape failed: external API unreachable");
    return;
  }

  const {
    jobs: externalJobs,
    seenDedupeKeys,
    snapshotComplete,
    sourceTotalJobs,
    fetchedSourceJobs,
    optimization,
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
        await db
          .update(jobsTable)
          .set({ ...job, scrapedAt: new Date() })
          .where(eq(jobsTable.id, existing[0].id));
        updated++;
      } else {
        const [inserted] = await db.insert(jobsTable).values({ ...job, scrapedAt: new Date() }).returning();
        newJobs.push(inserted);
        added++;
      }
    } catch (err) {
      failed++;
      logger.warn({ err, sourceUrl: job.sourceUrl, title: job.title }, "Skipping invalid scheduled job");
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
  logger.info(
    { added, updated, removed, failed, total: added + updated, analysis: optimization },
    "Scheduled scrape completed",
  );
}

export function startScraperCron({ runImmediately = false }: { runImmediately?: boolean } = {}): void {
  // Keep the mobile catalogue close to the upstream scraper dashboard.
  cron.schedule("*/15 * * * *", async () => {
    await runScheduledScrape();
  });

  logger.info("Scraper cron scheduled every 15 minutes");

  if (runImmediately) {
    logger.info("Running initial scrape on startup");
    // Run asynchronously so server startup is not blocked
    runScheduledScrape().catch((err) => {
      logger.error({ err }, "Initial startup scrape failed");
    });
  }
}
