const INVALID_DATE_BUCKET = "invalid";

type FeedJob = {
  id: number;
  company: string;
  postedAt: string | null;
  scrapedAt: Date;
};

function publicationDay(job: FeedJob): string {
  const postedAt = job.postedAt ? new Date(job.postedAt) : null;
  const date = postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : job.scrapedAt;
  return Number.isNaN(date.getTime()) ? INVALID_DATE_BUCKET : date.toISOString().slice(0, 10);
}

function companyKey(company: string): string {
  return company.trim().toLocaleLowerCase("fr-FR") || "entreprise-inconnue";
}

/**
 * Preserve day-level recency while preventing one company from monopolizing
 * the beginning of a feed when a source assigns near-identical timestamps to
 * a large batch of offers.
 */
export function diversifyJobsByCompany<T extends FeedJob>(jobs: T[]): T[] {
  const jobsByDay = new Map<string, T[]>();

  for (const job of jobs) {
    const day = publicationDay(job);
    const dayJobs = jobsByDay.get(day);
    if (dayJobs) dayJobs.push(job);
    else jobsByDay.set(day, [job]);
  }

  const result: T[] = [];

  for (const dayJobs of jobsByDay.values()) {
    const companyBuckets = new Map<string, T[]>();

    for (const job of dayJobs) {
      const key = companyKey(job.company);
      const companyJobs = companyBuckets.get(key);
      if (companyJobs) companyJobs.push(job);
      else companyBuckets.set(key, [job]);
    }

    const orderedBuckets = [...companyBuckets.values()].sort(
      (left, right) => Math.max(...right.map((job) => job.id)) - Math.max(...left.map((job) => job.id)),
    );

    for (let index = 0; ; index++) {
      let added = false;
      for (const bucket of orderedBuckets) {
        const job = bucket[index];
        if (!job) continue;
        result.push(job);
        added = true;
      }
      if (!added) break;
    }
  }

  return result;
}