export type JobIdentityInput = {
  sourceUrl?: string | null;
  title: string;
  company: string;
  location?: string | null;
  postedAt?: string | null;
};

export function normalizeJobSourceUrl(sourceUrl: string | null | undefined): string | null {
  const trimmed = sourceUrl?.trim();
  if (!trimmed) return null;

  const withoutFragment = trimmed.split("#", 1)[0] ?? trimmed;
  const withoutTrailingSlash = withoutFragment.replace(/\/+$/, "");
  return withoutTrailingSlash.toLowerCase();
}

function normalizeIdentityText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function jobDedupeKey(job: JobIdentityInput): string {
  const sourceUrl = normalizeJobSourceUrl(job.sourceUrl);
  if (sourceUrl) return `url:${sourceUrl}`;

  return [
    "fallback",
    normalizeIdentityText(job.title),
    normalizeIdentityText(job.company),
    normalizeIdentityText(job.location),
    normalizeIdentityText(job.postedAt),
  ].join("|||");
}