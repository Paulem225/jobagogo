import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import {
  getGetJobQueryKey,
  getGetPublicJobSharePreviewQueryKey,
  type Job,
} from "@workspace/api-client-react";
import { purgeUnavailableJob } from "./jobCache";

function job(id: number): Job {
  return {
    id,
    title: `Offre ${id}`,
    company: "Entreprise test",
    description: "Description",
    location: "Abidjan",
    skills: [],
    jobType: "CDI",
    source: "Test",
    scrapedAt: "2026-09-16T10:00:00.000Z",
  };
}

test("purges an unavailable job from detail and public preview caches", () => {
  const queryClient = new QueryClient();
  const unavailable = job(3145);

  queryClient.setQueryData(getGetJobQueryKey(unavailable.id), unavailable);
  queryClient.setQueryData(getGetPublicJobSharePreviewQueryKey(unavailable.id), unavailable);

  purgeUnavailableJob(queryClient, unavailable.id);

  assert.equal(queryClient.getQueryData(getGetJobQueryKey(unavailable.id)), undefined);
  assert.equal(
    queryClient.getQueryData(getGetPublicJobSharePreviewQueryKey(unavailable.id)),
    undefined,
  );
});

test("removes an unavailable job from every loaded Discover page", () => {
  const queryClient = new QueryClient();
  const unavailable = job(3145);
  const remaining = job(4701);
  const queryKey = ["discover-jobs", "", null];

  queryClient.setQueryData(queryKey, {
    pages: [[unavailable, remaining], [unavailable]],
    pageParams: [0, 50],
  });

  purgeUnavailableJob(queryClient, unavailable.id);

  assert.deepEqual(queryClient.getQueryData(queryKey), {
    pages: [[remaining], []],
    pageParams: [0, 50],
  });
});