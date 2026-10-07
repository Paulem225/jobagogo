const MAX_AUTOMATIC_REMOVAL_RATIO = 0.25;

type LocalJobIdentity = {
  id: number;
  dedupeKey: string;
};

export interface RemovalPlan {
  ids: number[];
  skippedReason: "incomplete-snapshot" | "excessive-removal" | null;
}

export function planMissingJobRemovals(
  localJobs: LocalJobIdentity[],
  seenDedupeKeys: Set<string>,
  snapshotComplete: boolean,
): RemovalPlan {
  if (!snapshotComplete) {
    return { ids: [], skippedReason: "incomplete-snapshot" };
  }

  const ids = localJobs
    .filter((job) => !seenDedupeKeys.has(job.dedupeKey))
    .map((job) => job.id);

  if (localJobs.length > 0 && ids.length / localJobs.length > MAX_AUTOMATIC_REMOVAL_RATIO) {
    return { ids: [], skippedReason: "excessive-removal" };
  }

  return { ids, skippedReason: null };
}