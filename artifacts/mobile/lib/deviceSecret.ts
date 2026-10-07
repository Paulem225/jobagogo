/**
 * Device-level identity credential.
 *
 * A random 32-byte hex secret is generated once per install and persisted
 * in SecureStore. It acts as a proof-of-device credential: the server stores
 * a SHA-256 hash of this value in the profile row (deviceSecretHash), so only
 * the originating device can later prove it owns the account (e.g. to
 * obtain a short-lived account-deletion token from POST /profile/delete-token).
 *
 * The raw secret is NEVER sent to the server in GET responses — it is only
 * compared server-side against the stored hash.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SECURE_STORE_KEY = "jobagogo_device_secret_v1";

/** In-memory cache so we don't hit SecureStore on every API call. */
let _cached: string | null = null;

function generateSecret(): string {
  // crypto.getRandomValues is available in React Native's JS runtime.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Returns the device secret, creating and persisting it on first call.
 * On web, returns an empty string (the server ignores the header on web
 * since CORS protections apply there instead).
 */
export async function getOrCreateDeviceSecret(): Promise<string> {
  if (Platform.OS === "web") return "";
  if (_cached) return _cached;

  try {
    const stored = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    if (stored) {
      _cached = stored;
      return stored;
    }
  } catch {
    // SecureStore may not be available in all simulator environments.
  }

  const secret = generateSecret();
  try {
    await SecureStore.setItemAsync(SECURE_STORE_KEY, secret);
  } catch {
    // Best-effort persistence; works from memory for this session.
  }
  _cached = secret;
  return secret;
}
