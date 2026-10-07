import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import {
  getGetJobQueryKey,
  getGetPublicJobSharePreviewQueryKey,
  getListSavedQueryKey,
  type Job,
} from "@workspace/api-client-react";

type DiscoverJobsData = InfiniteData<Job[]>;

/**
 * Remove a job that the API has confirmed is no longer available.
 *
 * The detail queries are cleared immediately so a later navigation cannot
 * render the old response while a new request is pending. Already loaded
 * Discover pages are filtered in place; the next focus/refresh still performs
 * a server refetch for pagination correctness.
 */
export function purgeUnavailableJob(queryClient: QueryClient, jobId: number): void {
  const detailQueryKey = getGetJobQueryKey(jobId);
  const publicQueryKey = getGetPublicJobSharePreviewQueryKey(jobId);

  // `setQueryData(key, undefined)` is treated as a no-op by React Query.
  // Null clears data for an active observer; inactive entries are removed
  // entirely below.
  queryClient.setQueryData(detailQueryKey, null);
  queryClient.setQueryData(publicQueryKey, null);
  queryClient.removeQueries({ queryKey: detailQueryKey, type: "inactive" });
  queryClient.removeQueries({ queryKey: publicQueryKey, type: "inactive" });

  queryClient.setQueriesData<DiscoverJobsData>(
    {
      predicate: (query) => query.queryKey[0] === "discover-jobs",
    },
    (current) => {
      if (!current) return current;

      return {
        ...current,
        pages: current.pages.map((page) => page.filter((job) => job.id !== jobId)),
      };
    },
  );

  void queryClient.invalidateQueries({
    queryKey: ["discover-jobs"],
    refetchType: "none",
  });
  void queryClient.invalidateQueries({
    queryKey: getListSavedQueryKey(),
    refetchType: "none",
  });
}