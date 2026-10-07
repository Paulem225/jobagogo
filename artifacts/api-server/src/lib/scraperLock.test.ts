import assert from "node:assert/strict";
import test from "node:test";
import { withScraperLock } from "./scraperLock";

type FakeClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<{ locked?: boolean }> }>;
  release: (err?: Error) => void;
};

function createFakeClientFactory() {
  let lockHeld = false;
  let releaseCount = 0;

  const acquireClient = async (): Promise<FakeClient> => ({
    async query(text) {
      if (text.includes("pg_try_advisory_lock")) {
        if (lockHeld) return { rows: [{ locked: false }] };
        lockHeld = true;
        return { rows: [{ locked: true }] };
      }

      lockHeld = false;
      return { rows: [{ locked: true }] };
    },
    release() {
      releaseCount++;
    },
  });

  return {
    acquireClient,
    isLockHeld: () => lockHeld,
    getReleaseCount: () => releaseCount,
  };
}

test("does not run a second scraping operation while the first holds the lock", async () => {
  const fake = createFakeClientFactory();
  let releaseFirstOperation!: () => void;
  const firstOperationReleased = new Promise<void>((resolve) => {
    releaseFirstOperation = resolve;
  });
  let firstOperationStarted = false;

  const first = withScraperLock(
    async () => {
      firstOperationStarted = true;
      await firstOperationReleased;
      return "first";
    },
    fake.acquireClient,
  );

  while (!firstOperationStarted) {
    await new Promise((resolve) => setImmediate(resolve));
  }

  const second = await withScraperLock(async () => "second", fake.acquireClient);
  assert.deepEqual(second, { acquired: false });
  assert.equal(fake.isLockHeld(), true);

  releaseFirstOperation();
  assert.deepEqual(await first, { acquired: true, value: "first" });
  assert.equal(fake.isLockHeld(), false);
  assert.equal(fake.getReleaseCount(), 2);
});