import AsyncStorage from "@react-native-async-storage/async-storage";

export type CachedMatch = {
  job: { id: number; [key: string]: unknown };
  fitScore: number;
  [key: string]: unknown;
};

export type MatchFeedCacheEntry = {
  savedAt: number;
  matches: CachedMatch[];
};

export const MATCH_FEED_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MATCH_FEED_CACHE_PREFIX = "jobagogo_match_feed_v1:";
let cacheGeneration = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAvailableMatch(value: unknown, now: number): value is CachedMatch {
  if (!isRecord(value) || !isRecord(value.job)) return false;
  const { job } = value;
  if (!Number.isSafeInteger(job.id) || Number(job.id) <= 0) return false;
  if (typeof value.fitScore !== "number" || !Number.isFinite(value.fitScore)) return false;

  const status = typeof job.status === "string" ? job.status.toLowerCase() : "";
  if (job.isActive === false || job.deletedAt != null || status === "deleted" || status === "expired") {
    return false;
  }

  const expiration = job.expiresAt ?? job.expirationDate ?? job.expiryDate;
  if (typeof expiration === "string" || typeof expiration === "number") {
    const expirationTime =
      typeof expiration === "number" ? expiration : Date.parse(expiration);
    if (Number.isFinite(expirationTime) && expirationTime <= now) return false;
  }

  return true;
}

export function filterAvailableMatches(
  matches: readonly unknown[],
  now = Date.now(),
): CachedMatch[] {
  return matches.filter((match) => isAvailableMatch(match, now));
}

export function parseMatchFeedCache(
  raw: string | null,
  now = Date.now(),
): MatchFeedCacheEntry | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.matches)) return null;
    if (typeof parsed.savedAt !== "number" || !Number.isFinite(parsed.savedAt)) return null;

    const age = now - parsed.savedAt;
    if (age < 0 || age > MATCH_FEED_CACHE_TTL_MS) return null;

    return {
      savedAt: parsed.savedAt,
      matches: filterAvailableMatches(parsed.matches, now),
    };
  } catch {
    return null;
  }
}

function getMatchFeedCacheKey(profileId: number): string {
  return `${MATCH_FEED_CACHE_PREFIX}${profileId}`;
}

export async function loadMatchFeedCache(profileId: number): Promise<CachedMatch[] | null> {
  if (!Number.isSafeInteger(profileId) || profileId <= 0) return null;
  const generation = cacheGeneration;
  const key = getMatchFeedCacheKey(profileId);
  const raw = await AsyncStorage.getItem(key);
  if (generation !== cacheGeneration) return null;
  const entry = parseMatchFeedCache(raw);

  if (!entry) {
    if (raw !== null) await AsyncStorage.removeItem(key);
    return null;
  }

  const parsed = JSON.parse(raw!) as { matches: unknown[] };
  if (entry.matches.length !== parsed.matches.length) {
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    if (generation !== cacheGeneration) {
      await AsyncStorage.removeItem(key);
      return null;
    }
  }
  return entry.matches;
}

export async function saveMatchFeedCache(
  profileId: number,
  matches: readonly unknown[],
): Promise<void> {
  if (!Number.isSafeInteger(profileId) || profileId <= 0) return;
  const generation = cacheGeneration;
  const key = getMatchFeedCacheKey(profileId);
  const entry: MatchFeedCacheEntry = {
    savedAt: Date.now(),
    matches: filterAvailableMatches(matches),
  };
  await AsyncStorage.setItem(key, JSON.stringify(entry));
  if (generation !== cacheGeneration) await AsyncStorage.removeItem(key);
}

export async function clearMatchFeedCaches(): Promise<void> {
  cacheGeneration += 1;
  const keys = await AsyncStorage.getAllKeys();
  const matchFeedKeys = keys.filter((key) => key.startsWith(MATCH_FEED_CACHE_PREFIX));
  if (matchFeedKeys.length > 0) await AsyncStorage.multiRemove(matchFeedKeys);
}