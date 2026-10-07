import { useFonts } from "expo-font";
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Image, Platform, StyleSheet, useWindowDimensions } from "react-native";
import {
  ActivityIndicator,
  Text,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useColors } from "@/hooks/useColors";
import {
  setBaseUrl,
  setAuthTokenGetter,
  setExtraHeaders,
  getGetProfileQueryKey,
  registerProfileNotifications,
  useGetProfile,
} from "@workspace/api-client-react";
import { getOrCreateDeviceSecret } from "@/lib/deviceSecret";
import {
  clearAuthToken,
  getAuthToken,
  getCachedProfileId,
  subscribeAuthToken,
} from "@/lib/authSession";
import {
  getFirebaseInitialNotification,
  registerForPushNotificationsAsync,
  subscribeToFirebaseTokenRefresh,
  subscribeToForegroundFirebaseNotifications,
  subscribeToOpenedFirebaseNotifications,
} from "@/lib/notifications";

// Web builds use the stable API origin. The Vercel landing page has its own
// same-origin proxy, while a direct Expo deployment can call the Replit API
// without depending on artifact path routing. Native apps use the same API.
const apiOrigin =
  process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ||
  "https://job-matcher.replit.app";
setBaseUrl(apiOrigin);
setAuthTokenGetter(getAuthToken);

SplashScreen.preventAutoHideAsync();

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const queryClient = new QueryClient();

const RING_EASING = Easing.bezier(0.16, 1, 0.3, 1);

// ─── Individual ring wave — separate component to respect hooks rules ───────
function RingWave({
  delay,
  maxSize,
  color,
}: {
  delay: number;
  maxSize: number;
  color: string;
}) {
  const scale = useSharedValue(0.05);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.72, { duration: 80 }),
        withTiming(0, { duration: 1100, easing: RING_EASING }),
      ),
    );
    scale.value = withDelay(
      delay,
      withTiming(1, { duration: 1180, easing: RING_EASING }),
    );
  }, [delay, opacity, scale]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: maxSize,
          height: maxSize,
          borderRadius: maxSize / 2,
          borderColor: color,
        },
        ringStyle,
      ]}
    />
  );
}

// ─── Central origin dot ──────────────────────────────────────────────────────
function OriginDot({ color }: { color: string }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 200, easing: RING_EASING }),
      withDelay(500, withTiming(0, { duration: 600, easing: RING_EASING })),
    );
    scale.value = withSequence(
      withTiming(1, { duration: 300, easing: RING_EASING }),
      withDelay(400, withTiming(2.4, { duration: 700, easing: RING_EASING })),
    );
  }, [opacity, scale]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[styles.originDot, { backgroundColor: color }, dotStyle]}
    />
  );
}

// ─── Main launch screen ──────────────────────────────────────────────────────
function LaunchScreen({ onFinish }: { onFinish: () => void }) {
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const shortestSide = Math.min(width, height);
  const logoSize = Math.min(400, Math.max(220, Math.min(width * 0.78, height * 0.44)));
  const ringSizes = [
    shortestSide * 0.36,
    shortestSide * 0.67,
    shortestSide * 0.97,
  ];

  // Logo animations
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.86);
  // Heartbeat glow behind logo
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.7);
  // Screen-level fade out
  const screenOpacity = useSharedValue(1);

  const hasFinished = useRef(false);
  const finish = useCallback(() => {
    if (hasFinished.current) return;
    hasFinished.current = true;
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    const smooth = Easing.bezier(0.22, 1, 0.36, 1);
    // Reanimated completion callbacks can occasionally be skipped when the
    // app is backgrounded or when web animation timing is throttled. Always
    // release the launch overlay after the intended animation duration.
    const fallbackTimer = setTimeout(finish, 4000);

    // Logo materialises at 380ms → fully visible at 1060ms
    logoOpacity.value = withDelay(
      380,
      withSequence(
        withTiming(1, { duration: 680, easing: smooth }),
        // single subtle inhale at ~1500ms
        withDelay(440, withTiming(0.88, { duration: 320, easing: smooth })),
        withTiming(1, { duration: 360, easing: smooth }),
        // hold until fade-out
        withDelay(480, withTiming(1, { duration: 1 })),
        withTiming(0, { duration: 820, easing: smooth }, (done) => {
          if (done) runOnJS(finish)();
        }),
      ),
    );

    logoScale.value = withDelay(
      380,
      withSequence(
        withTiming(1, { duration: 820, easing: smooth }),
        withDelay(1250, withTiming(1.04, { duration: 820, easing: smooth })),
      ),
    );

    // Glow halo — pulses once softly at the heartbeat moment
    glowOpacity.value = withSequence(
      withDelay(880, withTiming(0.55, { duration: 280, easing: smooth })),
      withTiming(0.18, { duration: 420, easing: smooth }),
      withDelay(380, withTiming(0.36, { duration: 300, easing: smooth })),
      withTiming(0, { duration: 600, easing: smooth }),
    );
    glowScale.value = withSequence(
      withDelay(880, withTiming(1, { duration: 280, easing: smooth })),
      withTiming(1.18, { duration: 700, easing: smooth }),
      withDelay(380, withTiming(1.18, { duration: 1 })),
      withTiming(1.38, { duration: 900, easing: smooth }),
    );

    // Screen fades out at 2620ms → done at 3440ms ≈ 3.5 s total
    screenOpacity.value = withDelay(
      2620,
      withTiming(0, { duration: 820, easing: smooth }),
    );

    return () => clearTimeout(fallbackTimer);
  }, [finish, glowOpacity, glowScale, logoOpacity, logoScale, screenOpacity]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.screen,
        { backgroundColor: "#0A0A0A", pointerEvents: "auto" },
        screenStyle,
      ]}
    >
      <StatusBar style="light" />

      {/* Three radar rings — staggered by 210ms */}
      <RingWave delay={0} maxSize={ringSizes[0]} color={colors.primary} />
      <RingWave delay={210} maxSize={ringSizes[1]} color={colors.primary} />
      <RingWave delay={420} maxSize={ringSizes[2]} color={colors.primary} />

      {/* Origin point that dissolves as logo appears */}
      <OriginDot color={colors.primary} />

      {/* Heartbeat glow disc behind logo */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: logoSize * 0.5,
            height: logoSize * 0.5,
            borderRadius: logoSize * 0.25,
            backgroundColor: colors.primary,
          },
          glowStyle,
        ]}
      />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { width: logoSize, height: logoSize }, logoStyle]}>
        <Image
          source={require("../assets/images/jobagogo-launch-logo.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Jobagogo"
        />
      </Animated.View>
    </Animated.View>
  );
}

// ─── Root layout ─────────────────────────────────────────────────────────────
function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="job/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="partage/offre/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

function AuthQueryCacheGuard() {
  const client = useQueryClient();

  useEffect(
    () =>
      subscribeAuthToken((_token, sessionChanged) => {
        if (!sessionChanged) return;
        void client.cancelQueries();
        client.clear();
      }),
    [client],
  );

  return null;
}

function ProfileGate() {
  const colors = useColors();
  const router = useRouter();
  const segments = useSegments();
  const [authReady, setAuthReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [hasCachedProfile, setHasCachedProfile] = useState(false);
  const { data: profile, isLoading, error } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey(), enabled: authReady && hasToken },
  });

  const isOnboarding = segments.some((segment) => segment === "onboarding");
  const isAuth = segments.some((segment) => segment === "auth");
  const isTabs = segments[0] === "(tabs)";
  const isPublicShare = segments.some((segment) => segment === "partage");
  const profileNotFound =
    !isLoading && !profile && (error as { status?: number } | null)?.status === 404;
  const unauthorized = (error as { status?: number } | null)?.status === 401;
  const needsOnboarding = Boolean(profile && !profile.title);

  useEffect(() => {
    let mounted = true;
    getAuthToken().then((token) => {
      if (mounted) {
        setHasToken(Boolean(token));
        setAuthReady(true);
      }
    });
    return subscribeAuthToken((token) => {
      if (mounted) {
        setHasToken(Boolean(token));
        setAuthReady(true);
      }
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    getCachedProfileId().then((profileId) => {
      if (mounted) setHasCachedProfile(profileId !== null);
    });

    const unsubscribe = subscribeAuthToken((_token, sessionChanged) => {
      if (mounted && sessionChanged) setHasCachedProfile(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || isPublicShare) return;
    if (!hasToken) {
      if (!isAuth) router.replace("/auth" as any);
      return;
    }
    if (unauthorized) {
      clearAuthToken().catch(() => undefined);
      if (!isAuth) router.replace("/auth" as any);
      return;
    }
    if (isAuth && !isLoading && profile) {
      router.replace(needsOnboarding ? "/onboarding" : "/(tabs)" as any);
      return;
    }
    if (!isLoading && (profileNotFound || needsOnboarding) && !isOnboarding) {
      router.replace("/onboarding" as any);
    }
  }, [
    authReady,
    hasToken,
    isAuth,
    isLoading,
    isOnboarding,
    isPublicShare,
    needsOnboarding,
    profile,
    profileNotFound,
    router,
    unauthorized,
  ]);

  if (isPublicShare || isAuth) return null;
  if (
    authReady &&
    hasToken &&
    hasCachedProfile &&
    isTabs &&
    !profileNotFound &&
    !unauthorized
  ) {
    return null;
  }
  if (!authReady || !hasToken || isOnboarding || (!isLoading && profile)) {
    if (isOnboarding && hasToken) return null;
    if (isPublicShare) return null;
    if (!authReady || !hasToken || isLoading || profileNotFound || unauthorized) {
      return (
        <View
          style={[
            styles.profileGate,
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.profileGateText, { color: colors.mutedForeground }]}>
            Préparation de ton espace…
          </Text>
        </View>
      );
    }
    return null;
  }

  return null;
}

function NotificationResponseRouter() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;

    const openedNotificationEvents = new Set<string>();
    const openNotificationJob = (jobId: unknown, eventId?: string) => {
      const normalizedJobId =
        typeof jobId === "number"
          ? Number.isSafeInteger(jobId) && jobId > 0
            ? String(jobId)
            : null
          : typeof jobId === "string" && /^\d+$/.test(jobId.trim())
            ? String(Number(jobId))
            : null;
      if (!normalizedJobId) return;

      const eventKey = eventId ?? `job:${normalizedJobId}`;
      if (openedNotificationEvents.has(eventKey)) return;
      openedNotificationEvents.add(eventKey);
      router.push(`/job/${normalizedJobId}` as any);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotificationJob(
        response.notification.request.content.data?.jobId,
        `expo:${response.notification.request.identifier}`,
      );
    });

    const firebaseOpenedSubscription = subscribeToOpenedFirebaseNotifications((message) => {
      openNotificationJob(message.data?.jobId, message.messageId ? `fcm:${message.messageId}` : undefined);
    });
    getFirebaseInitialNotification()
      .then((message) => {
        if (message) {
          openNotificationJob(
            message.data?.jobId,
            message.messageId ? `fcm:${message.messageId}` : undefined,
          );
        }
      })
      .catch(() => undefined);

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      openNotificationJob(
        lastResponse.notification.request.content.data?.jobId,
        `expo:${lastResponse.notification.request.identifier}`,
      );
      try {
        Notifications.clearLastNotificationResponse();
      } catch {
        // Some Expo runtimes do not expose the response store.
      }
    }

    return () => {
      subscription.remove();
      firebaseOpenedSubscription();
    };
  }, [router]);

  return null;
}

function FirebaseNotificationListeners() {
  const { data: profile } = useGetProfile();

  useEffect(() => {
    if (Platform.OS === "web") return;

    let cancelled = false;
    if (profile?.notificationsEnabled) {
      registerForPushNotificationsAsync()
        .then((registration) => {
          if (!registration || cancelled) return;
          return registerProfileNotifications({
            enabled: true,
            token: registration.token,
            platform: registration.platform,
          });
        })
        .catch(() => undefined);
    }

    const unsubscribeForeground = subscribeToForegroundFirebaseNotifications();
    const unsubscribeTokenRefresh = subscribeToFirebaseTokenRefresh((token) => {
      if (!profile?.notificationsEnabled) return;
      registerProfileNotifications({
        enabled: true,
        token,
        platform: Platform.OS === "ios" ? "ios" : "android",
      }).catch(() => undefined);
    });

    return () => {
      cancelled = true;
      unsubscribeForeground();
      unsubscribeTokenRefresh();
    };
  }, [profile?.notificationsEnabled]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });

    return () => subscription.remove();
  }, []);

  // Initialise the device-level identity credential on first mount.
  // setExtraHeaders wires it into every API request so the server can
  // hash+store it on POST /profile and verify it on POST /profile/delete-token.
  useEffect(() => {
    getOrCreateDeviceSecret()
      .then((secret) => {
        if (secret) setExtraHeaders({ "x-device-secret": secret });
      })
      .catch(() => {/* best-effort — deletion flow will fail gracefully */});
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular: require("../assets/fonts/Geist-Regular.ttf"),
    Geist_500Medium: require("../assets/fonts/Geist-Medium.ttf"),
    Geist_600SemiBold: require("../assets/fonts/Geist-SemiBold.ttf"),
    Geist_700Bold: require("../assets/fonts/Geist-Bold.ttf"),
    GeistMono_400Regular: require("../assets/fonts/GeistMono-Regular.ttf"),
    GeistMono_500Medium: require("../assets/fonts/GeistMono-Medium.ttf"),
    GeistMono_700Bold: require("../assets/fonts/GeistMono-Bold.ttf"),
  });
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const finishLaunchScreen = useCallback(() => setShowLaunchScreen(false), []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
              <AuthQueryCacheGuard />
              <ProfileGate />
              <NotificationResponseRouter />
              <FirebaseNotificationListeners />
              {showLaunchScreen && (
                <LaunchScreen onFinish={finishLaunchScreen} />
              )}
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  profileGate: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    zIndex: 80,
  },
  profileGateText: {
    fontFamily: "Geist_400Regular",
    fontSize: 13,
  },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
  },
  originDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0,
  },
  logoWrap: {
    width: 400,
    height: 400,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
});
