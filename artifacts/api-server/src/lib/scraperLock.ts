import { pool } from "@workspace/db";
import { logger } from "./logger";

const SCRAPER_LOCK_NAME = "jobagogo:scraper";

type AdvisoryLockClient = {
  query: (
    text: string,
    values?: unknown[],
  ) => Promise<{ rows: Array<{ locked?: boolean }> }>;
  release: (err?: Error) => void;
};

type AcquireClient = () => Promise<AdvisoryLockClient>;

const acquirePoolClient: AcquireClient = async () =>
  (await pool.connect()) as unknown as AdvisoryLockClient;

export type ScraperLockResult<T> =
  | { acquired: true; value: T }
  | { acquired: false };

/**
 * Runs one scraping operation while holding a PostgreSQL session advisory lock.
 * The lock is deliberately session-scoped, so the same client must be kept
 * throughout the operation and released only after it finishes.
 */
export async function withScraperLock<T>(
  operation: () => Promise<T>,
  acquireClient: AcquireClient = acquirePoolClient,
): Promise<ScraperLockResult<T>> {
  const client = await acquireClient();
  let destroyClient = false;

  try {
    const lockResult = await client.query(
      "SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked",
      [SCRAPER_LOCK_NAME],
    );
    if (lockResult.rows[0]?.locked !== true) {
      return { acquired: false };
    }

    try {
      return { acquired: true, value: await operation() };
    } finally {
      try {
        await client.query(
          "SELECT pg_advisory_unlock(hashtextextended($1, 0)) AS unlocked",
          [SCRAPER_LOCK_NAME],
        );
      } catch (error) {
        // Returning a client with an unknown session lock state to the pool
        // could block every future scraping operation in this process.
        destroyClient = true;
        logger.error({ err: error }, "Failed to release the scraper advisory lock");
      }
    }
  } finally {
    client.release(destroyClient ? new Error("Scraper advisory lock release failed") : undefined);
  }
}