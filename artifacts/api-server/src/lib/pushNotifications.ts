import { getApps, initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getMessaging, type Message } from "firebase-admin/messaging";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import {
  db,
  jobPushNotificationsTable,
  jobsTable,
  profilesTable,
  pushDevicesTable,
  type Job,
} from "@workspace/db";
import { computeMatchScore } from "./matching";
import { logger } from "./logger";

const MIN_NOTIFICATION_SCORE = 70;
const MAX_NOTIFICATIONS_PER_SYNC = 3;
const MAX_MESSAGES_PER_REQUEST = 500;
const MAX_REQUEST_RETRIES = 2;
const DELIVERY_RETRY_DELAYS_MS = [1000, 3000];
const REQUEST_RETRY_DELAYS_MS = [250, 750];

type FirebaseFailureKind = "device" | "credentials" | "transient" | "permanent";

type FirebasePushDelivery = {
  deviceId: number;
  profileId: number;
  pushToken: string;
  jobId: number | null;
  message: Message;
};

export type PushDeliveryCounters = {
  attempted: number;
  accepted: number;
  failed: number;
  disabledTokens: number;
};

type DeliveryResult = PushDeliveryCounters & {
  status: "accepted";
};

class FirebaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseConfigurationError";
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function serviceAccountFromEnvironment(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<ServiceAccount> & {
        project_id?: unknown;
        client_email?: unknown;
        private_key?: unknown;
      };
      const projectId =
        typeof parsed.projectId === "string"
          ? parsed.projectId
          : typeof parsed.project_id === "string"
            ? parsed.project_id
            : null;
      const clientEmail =
        typeof parsed.clientEmail === "string"
          ? parsed.clientEmail
          : typeof parsed.client_email === "string"
            ? parsed.client_email
            : null;
      const privateKey =
        typeof parsed.privateKey === "string"
          ? parsed.privateKey
          : typeof parsed.private_key === "string"
            ? parsed.private_key
            : null;

      if (projectId && clientEmail && privateKey) {
        return {
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        };
      }
    } catch (error) {
      throw new FirebaseConfigurationError(
        `FIREBASE_SERVICE_ACCOUNT_JSON est invalide: ${error instanceof Error ? error.message : "JSON invalide"}`,
      );
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

function getFirebaseMessaging() {
  const serviceAccount = serviceAccountFromEnvironment();
  if (!serviceAccount) {
    throw new FirebaseConfigurationError(
      "Les notifications Firebase ne sont pas configurées. Ajoute FIREBASE_SERVICE_ACCOUNT_JSON dans les Secrets Replit.",
    );
  }

  const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
  return getMessaging(app);
}

function isInvalidTokenError(code: string): boolean {
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token"
  );
}

function isTransientError(code: string): boolean {
  return (
    code === "messaging/server-unavailable" ||
    code === "messaging/internal-error" ||
    code === "messaging/quota-exceeded" ||
    code === "messaging/unknown-error"
  );
}

function classifyFirebaseError(code: string): FirebaseFailureKind {
  if (isInvalidTokenError(code)) return "device";
  if (isTransientError(code)) return "transient";
  if (
    code === "messaging/authentication-error" ||
    code === "messaging/mismatched-credential" ||
    code === "messaging/invalid-argument"
  ) {
    return "credentials";
  }
  return "permanent";
}

function failureMessage(code: string): string {
  switch (classifyFirebaseError(code)) {
    case "device":
      return "Firebase confirme que cet appareil n'est plus enregistré pour les notifications.";
    case "credentials":
      return "La configuration Firebase/APNs doit être réparée avant de pouvoir livrer cette notification.";
    case "transient":
      return "Firebase est momentanément indisponible pour cette notification.";
    default:
      return `Firebase a refusé la notification (${code}).`;
  }
}

async function disableInvalidPushDevice(
  deviceId: number,
  pushToken: string,
): Promise<boolean> {
  const disabled = await db
    .update(pushDevicesTable)
    .set({ enabled: false, updatedAt: new Date() })
    .where(and(eq(pushDevicesTable.id, deviceId), eq(pushDevicesTable.token, pushToken)))
    .returning({ id: pushDevicesTable.id });

  if (disabled.length > 0) {
    logger.info({ deviceId }, "Disabled an unregistered Firebase push token");
  }

  return disabled.length > 0;
}

function messageForJob(
  pushToken: string,
  job: Job,
  score: number,
): Message {
  return {
    token: pushToken,
    notification: {
      title: "Nouvelle offre pour toi",
      body: `${job.title} chez ${job.company} — correspondance ${score}%`,
    },
    data: {
      type: "job_match",
      jobId: String(job.id),
      score: String(score),
    },
    android: {
      priority: "high",
      notification: {
        channelId: "job-matches",
        sound: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
  };
}

function messageForManualNotification(
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Message {
  return {
    token: pushToken,
    notification: { title, body },
    data: {
      ...data,
      type: "manual_notification",
    },
    android: {
      priority: "high",
      notification: {
        channelId: "job-matches",
        sound: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
  };
}

async function sendFirebaseBatch(
  deliveries: FirebasePushDelivery[],
): Promise<{
  retryDeliveries: FirebasePushDelivery[];
  accepted: number;
  failed: number;
  disabledTokens: number;
}> {
  if (deliveries.length === 0) {
    return { retryDeliveries: [], accepted: 0, failed: 0, disabledTokens: 0 };
  }

  const messaging = getFirebaseMessaging();
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_REQUEST_RETRIES; attempt++) {
    try {
      const response = await messaging.sendEach(
        deliveries.map((delivery) => delivery.message),
      );
      const retryDeliveries: FirebasePushDelivery[] = [];
      let accepted = 0;
      let failed = 0;
      let disabledTokens = 0;

      for (let index = 0; index < response.responses.length; index++) {
        const delivery = deliveries[index];
        const sendResponse = response.responses[index];
        if (!delivery || !sendResponse) continue;
        if (sendResponse.success) {
          accepted += 1;
          logger.info(
            { profileId: delivery.profileId, deviceId: delivery.deviceId, jobId: delivery.jobId },
            "Firebase push notification accepted",
          );
          continue;
        }

        const code = sendResponse.error?.code ?? "messaging/unknown-error";
        const kind = classifyFirebaseError(code);
        if (kind === "device") {
          if (await disableInvalidPushDevice(delivery.deviceId, delivery.pushToken)) {
            disabledTokens += 1;
          }
        }
        logger.warn(
          { profileId: delivery.profileId, deviceId: delivery.deviceId, jobId: delivery.jobId, code },
          failureMessage(code),
        );
        if (kind === "transient") {
          retryDeliveries.push(delivery);
        } else {
          failed += 1;
        }
      }

      return { retryDeliveries, accepted, failed, disabledTokens };
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_REQUEST_RETRIES) throw error;
      logger.warn(
        { attempt: attempt + 1, err: error },
        "Retrying Firebase push batch",
      );
      await wait(REQUEST_RETRY_DELAYS_MS[attempt] ?? REQUEST_RETRY_DELAYS_MS.at(-1)!);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Firebase push batch failed");
}

async function deliverFirebaseNotifications(
  deliveries: FirebasePushDelivery[],
  deliveryAttempt = 0,
): Promise<DeliveryResult> {
  const retryDeliveries: FirebasePushDelivery[] = [];
  let accepted = 0;
  let failed = 0;
  let disabledTokens = 0;

  for (const deliveryBatch of chunk(deliveries, MAX_MESSAGES_PER_REQUEST)) {
    try {
      const batchResult = await sendFirebaseBatch(deliveryBatch);
      accepted += batchResult.accepted;
      failed += batchResult.failed;
      disabledTokens += batchResult.disabledTokens;
      retryDeliveries.push(...batchResult.retryDeliveries);
    } catch (error) {
      if (deliveryAttempt < MAX_REQUEST_RETRIES) {
        retryDeliveries.push(...deliveryBatch);
      } else {
        throw error;
      }
    }
  }

  if (retryDeliveries.length > 0 && deliveryAttempt < MAX_REQUEST_RETRIES) {
    await wait(
      DELIVERY_RETRY_DELAYS_MS[deliveryAttempt] ??
        DELIVERY_RETRY_DELAYS_MS.at(-1)!,
    );
    const retryResult = await deliverFirebaseNotifications(
      retryDeliveries,
      deliveryAttempt + 1,
    );
    return {
      status: "accepted",
      accepted: accepted + retryResult.accepted,
      failed: failed + retryResult.failed,
      disabledTokens: disabledTokens + retryResult.disabledTokens,
      attempted: deliveries.length + retryResult.attempted,
    };
  }

  if (retryDeliveries.length > 0) {
    failed += retryDeliveries.length;
    logger.warn(
      { failureCount: retryDeliveries.length },
      "Firebase push notifications remained transiently unavailable after retries",
    );
  }

  if (failed > 0) {
    logger.warn(
      { failureCount: failed },
      "Some Firebase push notifications were rejected",
    );
  }

  return {
    status: "accepted",
    attempted: deliveries.length,
    accepted,
    failed,
    disabledTokens,
  };
}

export function isFirebasePushToken(token: string): boolean {
  return token.trim().length >= 10 && token.trim().length <= 4096;
}

export async function notifyProfilesForNewJobs(newJobs: Job[]): Promise<void> {
  try {
    if (newJobs.length === 0) return;

    const registeredDevices = await db
      .select({
        device: pushDevicesTable,
        profile: profilesTable,
      })
      .from(pushDevicesTable)
      .innerJoin(profilesTable, eq(pushDevicesTable.profileId, profilesTable.id))
      .where(
        and(
          eq(pushDevicesTable.enabled, true),
          eq(profilesTable.notificationsEnabled, true),
          isNotNull(pushDevicesTable.token),
        ),
      );

    if (registeredDevices.length === 0) return;

    const matchesByProfile = new Map<
      number,
      { profileId: number; job: Job; score: number }[]
    >();
    for (const { device, profile } of registeredDevices) {
      if (!isFirebasePushToken(device.token)) {
        logger.warn({ deviceId: device.id }, "Skipping invalid Firebase push token");
        continue;
      }

      const matchingJobs = newJobs
        .map((job) => ({ job, score: computeMatchScore(profile, job).fitScore }))
        .filter(({ score }) => score >= MIN_NOTIFICATION_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_NOTIFICATIONS_PER_SYNC);

      if (matchingJobs.length > 0) {
        matchesByProfile.set(
          profile.id,
          matchingJobs.map(({ job, score }) => ({ profileId: profile.id, job, score })),
        );
      }
    }

    const candidatePairs = Array.from(matchesByProfile.values()).flat().map(({ profileId, job }) => ({
      profileId,
      jobId: job.id,
    }));
    if (candidatePairs.length === 0) return;

    const reservedPairs = await db
      .insert(jobPushNotificationsTable)
      .values(candidatePairs)
      .onConflictDoNothing()
      .returning({
        id: jobPushNotificationsTable.id,
        profileId: jobPushNotificationsTable.profileId,
        jobId: jobPushNotificationsTable.jobId,
      });
    const reservedPairKeys = new Set(
      reservedPairs.map(({ profileId, jobId }) => `${profileId}:${jobId}`),
    );
    if (reservedPairKeys.size === 0) return;

    const deliveries: FirebasePushDelivery[] = [];
    for (const { device, profile } of registeredDevices) {
      const matchingJobs = matchesByProfile.get(profile.id) ?? [];
      for (const { job, score } of matchingJobs) {
        if (!reservedPairKeys.has(`${profile.id}:${job.id}`)) continue;
        deliveries.push({
          deviceId: device.id,
          profileId: profile.id,
          pushToken: device.token,
          jobId: job.id,
          message: messageForJob(device.token, job, score),
        });
      }
    }

    if (deliveries.length > 0) {
      await deliverFirebaseNotifications(deliveries);
      await db
        .update(jobPushNotificationsTable)
        .set({ sentAt: new Date() })
        .where(inArray(jobPushNotificationsTable.id, reservedPairs.map(({ id }) => id)));
    }
  } catch (error) {
    // Push delivery must never make a scrape fail.
    logger.error({ err: error }, "Firebase push notification batch failed");
  }
}

export async function sendManualPushNotification(input: {
  title: string;
  body: string;
  data: Record<string, string>;
}): Promise<PushDeliveryCounters> {
  const registeredDevices = await db
    .select({
      device: pushDevicesTable,
      profile: profilesTable,
    })
    .from(pushDevicesTable)
    .innerJoin(profilesTable, eq(pushDevicesTable.profileId, profilesTable.id))
    .where(
      and(
        eq(pushDevicesTable.enabled, true),
        eq(profilesTable.notificationsEnabled, true),
      ),
    );

  let disabledTokens = 0;
  const deliveries: FirebasePushDelivery[] = [];

  for (const { device, profile } of registeredDevices) {
    if (!isFirebasePushToken(device.token)) {
      if (await disableInvalidPushDevice(device.id, device.token)) {
        disabledTokens += 1;
      }
      continue;
    }

    deliveries.push({
      deviceId: device.id,
      profileId: profile.id,
      pushToken: device.token,
      jobId: null,
      message: messageForManualNotification(
        device.token,
        input.title,
        input.body,
        input.data,
      ),
    });
  }

  if (deliveries.length === 0) {
    return {
      attempted: registeredDevices.length,
      accepted: 0,
      failed: registeredDevices.length - deliveries.length,
      disabledTokens,
    };
  }

  const result = await deliverFirebaseNotifications(deliveries);
  return {
    attempted: registeredDevices.length,
    accepted: result.accepted,
    failed: result.failed + (registeredDevices.length - deliveries.length),
    disabledTokens: disabledTokens + result.disabledTokens,
  };
}

export async function sendTestPushNotification(
  profileId: number,
  jobId: number,
): Promise<{
  sent: true;
  deliveryStatus: "accepted";
  jobId: number;
  title: string;
  company: string;
}> {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, profileId))
    .limit(1);

  if (!profile) {
    const error = new Error("No profile found.");
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  if (!profile.notificationsEnabled) {
    const error = new Error("Les notifications ne sont pas activées sur ce profil.");
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  const devices = await db
    .select()
    .from(pushDevicesTable)
    .where(
      and(
        eq(pushDevicesTable.profileId, profileId),
        eq(pushDevicesTable.enabled, true),
      ),
    );
  if (devices.length === 0) {
    const error = new Error("Aucun appareil n'est enregistré pour les notifications.");
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  const [job] = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.id, jobId))
    .limit(1);

  if (!job) {
    const error = new Error("Cette offre n'existe plus.");
    Object.assign(error, { statusCode: 404 });
    throw error;
  }

  const deliveries = devices
    .filter((device) => isFirebasePushToken(device.token))
    .map((device) => ({
      deviceId: device.id,
      profileId,
      pushToken: device.token,
      jobId: job.id,
      message: {
        ...messageForJob(device.token, job, 100),
        notification: {
          title: "Test notification Jobagogo",
          body: `${job.title} chez ${job.company}`,
        },
        data: {
          type: "notification_test",
          jobId: String(job.id),
        },
      },
    }));

  if (deliveries.length === 0) {
    const error = new Error("Les tokens Firebase enregistrés sont invalides.");
    Object.assign(error, { statusCode: 400 });
    throw error;
  }

  await deliverFirebaseNotifications(deliveries);

  return {
    sent: true,
    deliveryStatus: "accepted",
    jobId: job.id,
    title: job.title,
    company: job.company,
  };
}
