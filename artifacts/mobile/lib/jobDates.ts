const MILLISECONDS_PER_DAY = 86400000;

export interface JobDateFields {
  postedAt?: string | null;
  // Kept for the API response shape, but never used as a publication-date fallback.
  scrapedAt?: string | null;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Publication labels must reflect the source publication date only.
 * A scrape/retrieval timestamp is not a publication date and must never make
 * an undated offer appear as "Aujourd'hui".
 */
export function getJobDate(job: JobDateFields): Date | null {
  return parseDate(job.postedAt);
}

export function getJobCalendarDayDifference(job: JobDateFields, now = new Date()): number | null {
  const date = getJobDate(job);
  if (!date) return null;

  return Math.floor((startOfLocalDay(now) - startOfLocalDay(date)) / MILLISECONDS_PER_DAY);
}

export function formatRelativeJobDate(job: JobDateFields, now = new Date()): string | null {
  const date = getJobDate(job);
  if (!date) return null;

  const diffDays = getJobCalendarDayDifference(job, now);
  if (diffDays === null) return null;
  if (diffDays < 0) return "Date à venir";
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Il y a 1 jour";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 14) return "Il y a 1 semaine";
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  return `Il y a ${Math.floor(diffDays / 30)} mois`;
}