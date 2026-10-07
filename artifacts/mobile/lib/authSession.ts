import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { clearMatchFeedCaches } from "@/lib/matchFeedCache";

const AUTH_TOKEN_KEY = "jobagogo_auth_session_v1";
const CACHED_PROFILE_NAME_KEY = "jobagogo_cached_profile_name_v1";
const CACHED_PROFILE_ID_KEY = "jobagogo_cached_profile_id_v1";
let cachedToken: string | null | undefined;
let tokenReadPromise: Promise<string | null> | null = null;
let authSessionRevision = 0;
let cachedProfileIdWriteQueue: Promise<void> = Promise.resolve();
const listeners = new Set<(token: string | null, sessionChanged?: boolean) => void>();

async function readPersistedToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(AUTH_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

async function persistToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

async function removePersistedToken(): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

async function readPersistedProfileName(): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(CACHED_PROFILE_NAME_KEY);
  }
  return SecureStore.getItemAsync(CACHED_PROFILE_NAME_KEY);
}

async function persistProfileName(name: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(CACHED_PROFILE_NAME_KEY, name);
    return;
  }
  await SecureStore.setItemAsync(CACHED_PROFILE_NAME_KEY, name);
}

async function removePersistedProfileName(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(CACHED_PROFILE_NAME_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(CACHED_PROFILE_NAME_KEY);
  } catch {
    // The cached name is only an opening-screen optimization.
  }
}

function enqueueCachedProfileIdWrite(operation: () => Promise<void>): Promise<void> {
  const pending = cachedProfileIdWriteQueue.then(operation, operation);
  cachedProfileIdWriteQueue = pending.catch(() => undefined);
  return pending;
}

async function removePersistedProfileId(): Promise<void> {
  await enqueueCachedProfileIdWrite(async () => {
    try {
      if (Platform.OS === "web") {
        await AsyncStorage.removeItem(CACHED_PROFILE_ID_KEY);
        return;
      }
      await SecureStore.deleteItemAsync(CACHED_PROFILE_ID_KEY);
    } catch {
      // The cached account id is only an offline feed lookup hint.
    }
  });
}

async function readPersistedProfileId(): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(CACHED_PROFILE_ID_KEY);
  }
  return SecureStore.getItemAsync(CACHED_PROFILE_ID_KEY);
}

async function persistProfileId(profileId: number): Promise<void> {
  const value = String(profileId);
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(CACHED_PROFILE_ID_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(CACHED_PROFILE_ID_KEY, value);
}

function notify(sessionChanged = false) {
  const token = cachedToken ?? null;
  listeners.forEach((listener) => listener(token, sessionChanged));
}

export function subscribeAuthToken(
  listener: (token: string | null, sessionChanged?: boolean) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getAuthToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  if (tokenReadPromise) return tokenReadPromise;

  const revision = authSessionRevision;
  const pendingRead = (async () => {
    try {
      const token = await readPersistedToken();
      if (authSessionRevision === revision) cachedToken = token;
    } catch {
      if (authSessionRevision === revision) cachedToken = null;
    }
    return cachedToken ?? null;
  })();
  tokenReadPromise = pendingRead;

  try {
    return await pendingRead;
  } finally {
    if (tokenReadPromise === pendingRead) tokenReadPromise = null;
  }
}

export async function getCachedProfileName(): Promise<string | null> {
  try {
    const name = await readPersistedProfileName();
    return name?.trim() || null;
  } catch {
    return null;
  }
}

export async function getCachedProfileId(): Promise<number | null> {
  const revision = authSessionRevision;
  try {
    const token = await getAuthToken();
    if (!token || revision !== authSessionRevision) return null;

    const storedId = await readPersistedProfileId();
    if (revision !== authSessionRevision) return null;

    const profileId = Number(storedId);
    return Number.isSafeInteger(profileId) && profileId > 0 ? profileId : null;
  } catch {
    return null;
  }
}

export async function saveCachedProfileName(name: string): Promise<void> {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  if (!normalizedName) return;
  try {
    await persistProfileName(normalizedName);
  } catch {
    // A cache write failure must not block the profile or feed.
  }
}

export async function saveCachedProfileId(profileId: number): Promise<void> {
  if (!Number.isSafeInteger(profileId) || profileId <= 0) return;

  const revision = authSessionRevision;
  const token = await getAuthToken();
  if (!token || revision !== authSessionRevision) return;

  try {
    await enqueueCachedProfileIdWrite(async () => {
      if (revision !== authSessionRevision) return;
      await persistProfileId(profileId);
    });
  } catch {
    // A cache write failure must not block the profile or feed.
  }
}

export async function saveAuthToken(token: string): Promise<void> {
  const previousToken = await getAuthToken();
  const sessionChanged = previousToken !== token;
  if (sessionChanged) {
    await removePersistedProfileName();
    authSessionRevision += 1;
    tokenReadPromise = null;
    await removePersistedProfileId();
    await clearMatchFeedCaches().catch(() => undefined);
  }
  cachedToken = token;
  await persistToken(token);
  notify(sessionChanged);
}

export async function clearAuthToken(): Promise<void> {
  authSessionRevision += 1;
  tokenReadPromise = null;
  cachedToken = null;
  try {
    await removePersistedToken();
  } catch {
    // The in-memory token is still cleared if SecureStore is unavailable.
  }
  await removePersistedProfileName();
  await removePersistedProfileId();
  await clearMatchFeedCaches().catch(() => undefined);
  notify(true);
}