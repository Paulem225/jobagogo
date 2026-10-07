import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { RemoteMessage } from "@react-native-firebase/messaging";

export type FirebasePushRegistration = {
  token: string;
  platform: "ios" | "android";
};

type FirebaseMessagingModule = typeof import("@react-native-firebase/messaging");

function canUseFirebaseMessaging(): boolean {
  return (
    Platform.OS !== "web" &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
  );
}

async function loadFirebaseMessaging(): Promise<FirebaseMessagingModule | null> {
  if (!canUseFirebaseMessaging()) return null;

  try {
    return await import("@react-native-firebase/messaging");
  } catch {
    return null;
  }
}

function isAuthorized(
  status: number,
  authorizationStatus: FirebaseMessagingModule["AuthorizationStatus"],
): boolean {
  return (
    status === authorizationStatus.AUTHORIZED ||
    status === authorizationStatus.PROVISIONAL
  );
}

async function ensureLocalNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("job-matches", {
    name: "Offres correspondantes",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    sound: "default",
  });
}

async function requestAndroidNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  // Android 13+ requires the POST_NOTIFICATIONS runtime permission. The
  // Firebase Messaging permission helpers are primarily for Apple platforms,
  // so use Expo Notifications for the Android system prompt.
  await ensureLocalNotificationChannel();
  const currentPermission = await Notifications.getPermissionsAsync();
  if (currentPermission.granted) return true;
  if (!currentPermission.canAskAgain) return false;

  const requestedPermission = await Notifications.requestPermissionsAsync();
  return requestedPermission.granted;
}

export async function registerForPushNotificationsAsync(): Promise<FirebasePushRegistration | null> {
  if (Platform.OS === "web") return null;

  try {
    const firebaseMessaging = await loadFirebaseMessaging();
    if (!firebaseMessaging) return null;

    const messaging = firebaseMessaging.getMessaging();
    await firebaseMessaging.registerDeviceForRemoteMessages(messaging);

    if (Platform.OS === "android") {
      if (!(await requestAndroidNotificationPermission())) return null;
    } else {
      let status = await firebaseMessaging.hasPermission(messaging);
      if (!isAuthorized(status, firebaseMessaging.AuthorizationStatus)) {
        status = await firebaseMessaging.requestPermission(messaging, {
          alert: true,
          badge: true,
          sound: true,
          provisional: true,
        });
      }

      if (!isAuthorized(status, firebaseMessaging.AuthorizationStatus)) return null;
    }

    await ensureLocalNotificationChannel();
    const token = await firebaseMessaging.getToken(messaging);
    if (token.trim().length < 10) {
      throw new Error("Firebase a renvoyé un token de notification invalide.");
    }

    return {
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Firebase a renvoyé un token de notification invalide."
    ) {
      throw error;
    }

    throw new Error(
      "Impossible d’enregistrer cet appareil auprès de Firebase. Vérifie la configuration de l’application et réessaie depuis une build mobile.",
    );
  }
}

export function subscribeToFirebaseTokenRefresh(
  onToken: (token: string) => void,
): () => void {
  let cancelled = false;
  let unsubscribe: () => void = () => undefined;

  loadFirebaseMessaging()
    .then((firebaseMessaging) => {
      if (!firebaseMessaging || cancelled) return;
      unsubscribe = firebaseMessaging.onTokenRefresh(
        firebaseMessaging.getMessaging(),
        onToken,
      );
    })
    .catch(() => undefined);

  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export function subscribeToForegroundFirebaseNotifications(
  onForegroundMessage?: (message: RemoteMessage) => void,
): () => void {
  let cancelled = false;
  let unsubscribe: () => void = () => undefined;

  loadFirebaseMessaging()
    .then((firebaseMessaging) => {
      if (!firebaseMessaging || cancelled) return;
      unsubscribe = firebaseMessaging.onMessage(
        firebaseMessaging.getMessaging(),
        async (message: RemoteMessage) => {
          onForegroundMessage?.(message);

          const title = message.notification?.title ?? "Nouvelle offre pour toi";
          const body = message.notification?.body ?? "Une nouvelle offre correspond à ton profil.";
          const data = Object.fromEntries(
            Object.entries(message.data ?? {}).map(([key, value]) => [
              key,
              typeof value === "string" ? value : JSON.stringify(value),
            ]),
          );
          await ensureLocalNotificationChannel();
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data,
              sound: "default",
            },
            trigger:
              Platform.OS === "android" ? { channelId: "job-matches" } : null,
          });
        },
      );
    })
    .catch(() => undefined);

  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export async function getFirebaseInitialNotification(): Promise<RemoteMessage | null> {
  const firebaseMessaging = await loadFirebaseMessaging();
  if (!firebaseMessaging) return null;

  try {
    return await firebaseMessaging.getInitialNotification(
      firebaseMessaging.getMessaging(),
    );
  } catch {
    return null;
  }
}

export function subscribeToOpenedFirebaseNotifications(
  onMessageCallback: (message: RemoteMessage) => void,
): () => void {
  let cancelled = false;
  let unsubscribe: () => void = () => undefined;

  loadFirebaseMessaging()
    .then((firebaseMessaging) => {
      if (!firebaseMessaging || cancelled) return;
      unsubscribe = firebaseMessaging.onNotificationOpenedApp(
        firebaseMessaging.getMessaging(),
        onMessageCallback,
      );
    })
    .catch(() => undefined);

  return () => {
    cancelled = true;
    unsubscribe();
  };
}