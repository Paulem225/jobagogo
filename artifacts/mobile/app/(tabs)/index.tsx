import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMatches,
  getGetMatchesQueryKey,
  useListSaved,
  getListSavedQueryKey,
  useSaveJob,
  useUnsaveJob,
  useTriggerScrape,
  useGetProfile,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { TouchableOpacity } from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  getTimelineDate,
  getTimelinePeriod,
  type TimelinePeriodLabel,
} from "@/components/FeedTimeline";
import { PremiumGateCard, FREE_LIMIT } from "@/components/PremiumGate";
import {
  getCachedProfileId,
  getCachedProfileName,
  saveCachedProfileId,
  saveCachedProfileName,
  subscribeAuthToken,
} from "@/lib/authSession";
import {
  filterAvailableMatches,
  loadMatchFeedCache,
  saveMatchFeedCache,
} from "@/lib/matchFeedCache";

type MatchItem = {
  job: {
    id: number;
    postedAt?: string | null;
    scrapedAt?: string;
    [key: string]: any;
  };
  fitScore: number;
};
type FeedItem =
  | { type: "period"; label: TimelinePeriodLabel; matches: MatchItem[] }
  | { type: "premium-gate"; lockedCount: number };

const PLACEHOLDER_PROFILE_NAMES = new Set(["nouveau candidat", "utilisateur", "new candidate"]);

function usableProfileName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || PLACEHOLDER_PROFILE_NAMES.has(normalized.toLocaleLowerCase("fr-FR"))) {
    return null;
  }
  return normalized;
}

const HOME_COLORS = {
  profileStart: "#7A6BD6",
  profileEnd: "#5F4BB6",
  notification: "#FF3B30",
  white: "#FFFFFF",
} as const;

const FEATURED_CARD_WIDTH = 320;
const FEATURED_CARD_GAP = 16;
const FEATURED_SNAP_INTERVAL = FEATURED_CARD_WIDTH + FEATURED_CARD_GAP;

function HomeCompanyMark({ job, large = false }: { job: MatchItem["job"]; large?: boolean }) {
  const colors = useColors();
  const [hasError, setHasError] = useState(false);

  return (
    <View
      style={[
        large ? styles.featuredCompanyMark : styles.rowCompanyMark,
        {
          backgroundColor: large ? HOME_COLORS.white : colors.primary + "12",
          borderColor: large ? HOME_COLORS.white : colors.primary + "45",
        },
      ]}
    >
      {job.logoUrl && !hasError ? (
        <Image
          source={{ uri: job.logoUrl }}
          style={large ? styles.featuredCompanyLogo : styles.rowCompanyLogo}
          resizeMode="cover"
          onError={() => setHasError(true)}
          accessibilityLabel={`Logo de ${job.company}`}
        />
      ) : (
        <Text style={[large ? styles.featuredCompanyInitial : styles.rowCompanyInitial, { color: colors.primary }]}>
          {String(job.company ?? "?").charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

function FeaturedTagRow({ labels }: { labels: string[] }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [tagWidths, setTagWidths] = useState<Record<number, number>>({});
  const tagKey = labels.join("\u0001");

  useEffect(() => {
    setTagWidths({});
  }, [tagKey]);

  const allTagsMeasured = labels.every((_, index) => tagWidths[index] !== undefined);
  let visibleCount = labels.length;

  if (containerWidth > 0 && allTagsMeasured) {
    let usedWidth = 0;
    visibleCount = 0;

    for (let index = 0; index < labels.length; index += 1) {
      const nextWidth = usedWidth + (index > 0 ? 8 : 0) + tagWidths[index];
      if (nextWidth > containerWidth) break;
      usedWidth = nextWidth;
      visibleCount += 1;
    }
  }

  return (
    <View
      style={styles.featuredTagsViewport}
      onLayout={({ nativeEvent }) => setContainerWidth(nativeEvent.layout.width)}
    >
      <View style={styles.featuredTags}>
        {labels.slice(0, visibleCount).map((label, index) => (
          <View
            style={styles.featuredTag}
            key={`${index}-${label}`}
            onLayout={({ nativeEvent }) => {
              const width = nativeEvent.layout.width;
              setTagWidths((current) =>
                current[index] === width ? current : { ...current, [index]: width },
              );
            }}
          >
            <Text style={styles.featuredTagText} numberOfLines={1}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FeaturedHomeCard({
  job,
  fitScore,
  tone,
  isSaved,
  onSave,
  onOpen,
}: {
  job: MatchItem["job"];
  fitScore: number;
  tone: "blue" | "yellow" | "green";
  isSaved: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  const toneColors = {
    blue: ["#6C93E8", "#4C74D8"],
    yellow: ["#FBBC4C", "#F2A93B"],
    green: ["#4FC8A0", "#2D9F79"],
  } as const;
  const skills = Array.isArray(job.skills) ? job.skills.slice(0, 2) : [];
  const labels = [job.jobType, ...skills].filter(
    (label): label is string => typeof label === "string" && label.trim().length > 0,
  );

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onOpen}
      style={styles.featuredCardShell}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${job.title}`}
    >
      <LinearGradient
        colors={toneColors[tone]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featuredCard}
      >
        <View style={[styles.cardSparkle, styles.cardSparkleOne]} />
        <View style={[styles.cardSparkle, styles.cardSparkleTwo]} />
        <View style={[styles.cardSparkle, styles.cardSparkleThree]} />
        <View style={styles.featuredCardTop}>
          <HomeCompanyMark job={job} large />
          <View style={styles.featuredCardActions}>
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeScore}>{Math.round(fitScore)}%</Text>
              <Text style={styles.matchBadgeLabel}>MATCH</Text>
            </View>
            <TouchableOpacity
              onPress={onSave}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={isSaved ? `Retirer ${job.title} des sauvegardes` : `Sauvegarder ${job.title}`}
            >
              <Feather
                name="bookmark"
                size={19}
                color={HOME_COLORS.white}
                fill={isSaved ? HOME_COLORS.white : "none"}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.featuredCardCopy}>
          <Text style={styles.featuredCardTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.featuredCardCompany} numberOfLines={1}>{job.company}</Text>
        </View>
        <FeaturedTagRow labels={labels} />
        <View style={styles.featuredLocation}>
          <Feather name="map-pin" size={13} color="rgba(255,255,255,0.9)" />
          <Text style={styles.featuredLocationText} numberOfLines={1}>{job.location}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function HomeOpportunityRow({
  job,
  fitScore,
  isSaved,
  onSave,
  onOpen,
}: {
  job: MatchItem["job"];
  fitScore: number;
  isSaved: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  const colors = useColors();
  const skills = Array.isArray(job.skills) ? job.skills.slice(0, 2) : [];

  return (
    <View style={[styles.opportunityRow, { borderTopColor: colors.border }]}>
      <TouchableOpacity
        style={styles.opportunityTapArea}
        onPress={onOpen}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Voir l'offre ${job.title}`}
      >
        <HomeCompanyMark job={job} />
        <View style={styles.opportunityCopy}>
          <Text style={[styles.opportunityCompany, { color: colors.mutedForeground }]} numberOfLines={1}>
            {job.company} <Text style={{ color: colors.primary }}>· {Math.round(fitScore)}%</Text>
          </Text>
          <Text style={[styles.opportunityTitle, { color: colors.foreground }]} numberOfLines={2}>
            {job.title}
          </Text>
          <View style={styles.opportunityMetaLine}>
            <Text style={[styles.opportunityMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
              {job.location}{job.remote ? " · Remote" : ""} · {job.jobType}
            </Text>
            <Text style={[styles.opportunityDate, { color: colors.mutedForeground }]} numberOfLines={1}>
              {getTimelineDate(job as any)}
            </Text>
          </View>
          {!!skills.length && (
            <View style={styles.opportunitySkills}>
              {skills.map((skill: string) => (
                <View key={skill} style={[styles.opportunitySkillChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.opportunitySkillText, { color: colors.secondaryForeground }]} numberOfLines={1}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onSave}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={isSaved ? `Retirer ${job.title} des sauvegardes` : `Sauvegarder ${job.title}`}
        style={styles.rowSaveButton}
      >
        <Feather name="bookmark" size={18} color={isSaved ? colors.primary : colors.mutedForeground} fill={isSaved ? colors.primary : "none"} />
      </TouchableOpacity>
      <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
    </View>
  );
}

function HomePeriod({
  label,
  children,
}: {
  label: TimelinePeriodLabel;
  count: number;
  children: React.ReactNode;
}) {
  const colors = useColors();

  return (
    <View style={styles.period}>
      <View style={[styles.periodRail, { backgroundColor: colors.border }]} />
      <View style={styles.periodHeading}>
        <View style={[styles.periodDot, { backgroundColor: colors.background, borderColor: colors.primary }]} />
        <Text style={[styles.periodLabel, { color: colors.secondaryForeground }]}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile, error: profileError } = useGetProfile();
  const [cachedProfileName, setCachedProfileName] = useState<string | null>(null);
  const [cachedProfileId, setCachedProfileId] = useState<number | null>(null);
  const [cachedFeed, setCachedFeed] = useState<{
    profileId: number;
    matches: MatchItem[];
  } | null>(null);
  const [cacheLoadedForProfileId, setCacheLoadedForProfileId] = useState<number | null>(null);
  const profileName =
    usableProfileName((profile as any)?.name) ??
    usableProfileName((profile as any)?.fullName);
  const profileNotFound = (profileError as any)?.status === 404;
  const activeProfileId = profile?.id ?? cachedProfileId;

  useEffect(() => {
    let active = true;
    getCachedProfileName().then((name) => {
      if (active) setCachedProfileName(usableProfileName(name));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getCachedProfileId().then((profileId) => {
      if (active) setCachedProfileId(profileId);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => subscribeAuthToken((_token, sessionChanged) => {
    setCachedProfileName(null);
    if (!sessionChanged) return;
    setCachedProfileId(null);
    setCachedFeed(null);
    setCacheLoadedForProfileId(null);
  }), []);

  useEffect(() => {
    if (!profileName) return;
    setCachedProfileName(profileName);
    void saveCachedProfileName(profileName);
  }, [profileName]);

  useEffect(() => {
    if (!profile?.id) return;
    setCachedProfileId(profile.id);
    void saveCachedProfileId(profile.id);
  }, [profile?.id]);

  useEffect(() => {
    let active = true;
    setCachedFeed(null);
    setCacheLoadedForProfileId(null);
    if (!activeProfileId) return;

    loadMatchFeedCache(activeProfileId)
      .then((matches) => {
        if (!active) return;
        setCachedFeed(
          matches
            ? { profileId: activeProfileId, matches: matches as MatchItem[] }
            : null,
        );
        setCacheLoadedForProfileId(activeProfileId);
      })
      .catch(() => {
        if (!active) return;
        setCachedFeed(null);
        setCacheLoadedForProfileId(activeProfileId);
      });

    return () => {
      active = false;
    };
  }, [activeProfileId]);

  const matchesQueryKey = useMemo(
    () => [...getGetMatchesQueryKey(), "profile", activeProfileId ?? "unresolved"],
    [activeProfileId],
  );
  const {
    data: serverMatches,
    isLoading: isMatchesLoading,
    refetch,
    isRefetching,
  } = useGetMatches(undefined, {
    query: { queryKey: matchesQueryKey, enabled: activeProfileId !== null },
  });

  const freshMatches = useMemo(
    () =>
      serverMatches === undefined
        ? undefined
        : (filterAvailableMatches(serverMatches) as MatchItem[]),
    [serverMatches],
  );
  const matches =
    freshMatches ??
    (cachedFeed?.profileId === activeProfileId ? cachedFeed.matches : undefined);
  const isFeedLoading =
    matches === undefined &&
    (isMatchesLoading ||
      (activeProfileId !== null && cacheLoadedForProfileId !== activeProfileId));

  useEffect(() => {
    if (activeProfileId === null || freshMatches === undefined) return;
    void saveMatchFeedCache(activeProfileId, freshMatches).catch(() => undefined);
  }, [activeProfileId, freshMatches]);

  const { data: savedJobs } = useListSaved({ query: { queryKey: getListSavedQueryKey() } });
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();
  const triggerScrape = useTriggerScrape();

  const savedIds = new Set((savedJobs ?? []).map((s) => s.jobId));

  useEffect(() => {
    if (profile && freshMatches?.length === 0 && !triggerScrape.isPending) {
      triggerScrape.mutate(
        { data: {} },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() }) }
      );
    }
  }, [profile, freshMatches]);

  const handleSave = useCallback(
    (jobId: number) => {
      saveJob.mutate(
        { data: { jobId } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSavedQueryKey() }) }
      );
    },
    [saveJob, queryClient]
  );

  const handleUnsave = useCallback(
    (jobId: number) => {
      unsaveJob.mutate(
        { jobId },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSavedQueryKey() }) }
      );
    },
    [unsaveJob, queryClient]
  );

  const topPadding = Platform.OS === "web" ? 67 : insets.top + 16;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [profilePhotoError, setProfilePhotoError] = useState(false);

  const isPremium = profile?.isPremium ?? false;
  const profilePhoto = profile?.profilePhoto ?? null;

  useEffect(() => {
    setProfilePhotoError(false);
  }, [profilePhoto]);

  // Build the graduated feed: the first match is featured, the rest are grouped by publication period.
  const allMatches = matches ?? [];
  const visibleMatches = isPremium ? allMatches : allMatches.slice(0, FREE_LIMIT);
  const lockedCount = Math.max(0, allMatches.length - FREE_LIMIT);

  const leadMatch = visibleMatches[0] as MatchItem | undefined;
  const periodOrder: TimelinePeriodLabel[] = ["Aujourd'hui", "Hier", "Cette semaine"];
  const feedItems: FeedItem[] = periodOrder.reduce<FeedItem[]>((items, label) => {
    const periodMatches = visibleMatches
      .slice(1)
       .filter((match) => getTimelinePeriod(match.job) === label) as MatchItem[];
    if (periodMatches.length > 0) items.push({ type: "period", label, matches: periodMatches });
    return items;
  }, []);

  if (!isPremium && lockedCount > 0) {
    feedItems.push({ type: "premium-gate", lockedCount });
  }

  const leadMatches = visibleMatches.slice(0, 3) as MatchItem[];
  const featuredScrollRef = useRef<ScrollView | null>(null);
  const safeFeaturedIndex = Math.min(activeFeaturedIndex, Math.max(0, leadMatches.length - 1));
  const greetingName = profileName ?? cachedProfileName;
  const displayName = greetingName?.split(/\s+/)[0] ?? null;

  useEffect(() => {
    setActiveFeaturedIndex((currentIndex) =>
      Math.min(currentIndex, Math.max(0, leadMatches.length - 1)),
    );
  }, [leadMatches.length]);

  const selectFeaturedMatch = (index: number) => {
    setActiveFeaturedIndex(index);
    featuredScrollRef.current?.scrollTo({
      x: index * FEATURED_SNAP_INTERVAL,
      animated: true,
    });
  };

  if (profileNotFound) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPadding }]}>
        <Feather name="user" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Créez votre profil</Text>
        <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
          Configurez votre profil pour recevoir des offres personnalisées
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/onboarding" as any)}
        >
          <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
            Configurer mon profil
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.homeHeader,
          { paddingTop: topPadding, backgroundColor: colors.background },
        ]}
      >
        <View>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>Bienvenue chez Jobagogo !</Text>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            {displayName ? `Bonjour, ${displayName} !` : "Bonjour !"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push("/(tabs)/profile" as any)}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir mon profil"
        >
          {profilePhoto && !profilePhotoError ? (
            <Image
              source={{ uri: profilePhoto }}
              style={styles.profileButtonImage}
              resizeMode="cover"
              onError={() => setProfilePhotoError(true)}
              accessibilityLabel="Photo de profil"
            />
          ) : (
            <LinearGradient
              colors={[HOME_COLORS.profileStart, HOME_COLORS.profileEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileButtonGradient}
            >
              <Feather name="user" size={22} color={HOME_COLORS.white} />
            </LinearGradient>
          )}
          <View style={[styles.profileNotification, { borderColor: colors.background }]} />
        </TouchableOpacity>
      </View>

      {isFeedLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Chargement des offres...
          </Text>
        </View>
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={(item) =>
            item.type === "period" ? `period-${item.label}` : "premium-gate"
          }
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: bottomPadding,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            visibleMatches.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="briefcase" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  Aucune offre disponible
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                  Tirez vers le bas pour actualiser ou attendez le chargement des offres
                </Text>
              </View>
            ) : null
          }
          ListHeaderComponent={
            <View style={styles.homeListHeader}>
              <View style={styles.searchRow}>
                <TouchableOpacity
                  style={[styles.searchBar, { backgroundColor: colors.secondary }]}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/discover" as any,
                      params: { mode: "search", origin: "home", search: "", submitted: "0" },
                    })
                  }
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Ouvrir la recherche"
                >
                  <Feather name="search" size={17} color={colors.mutedForeground} />
                  <Text style={[styles.searchInput, { color: colors.mutedForeground }]}>
                    Quel poste recherchez-vous ?
                  </Text>
                </TouchableOpacity>
              </View>
              {leadMatches.length > 0 ? (
                <>
                <Text style={[styles.bestMatchHeading, { color: colors.foreground }]}>
                  Votre meilleur match
                </Text>
                <ScrollView
                  ref={featuredScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredList}
                  snapToInterval={FEATURED_SNAP_INTERVAL}
                  decelerationRate="fast"
                  scrollEventThrottle={16}
                  onScroll={(event) => {
                    const nextIndex = Math.round(
                      event.nativeEvent.contentOffset.x / FEATURED_SNAP_INTERVAL,
                    );
                    const boundedIndex = Math.max(0, Math.min(nextIndex, leadMatches.length - 1));
                    setActiveFeaturedIndex((currentIndex) =>
                      currentIndex === boundedIndex ? currentIndex : boundedIndex,
                    );
                  }}
                >
                  {leadMatches.map((match, index) => (
                    <FeaturedHomeCard
                      key={match.job.id}
                      job={match.job}
                      fitScore={match.fitScore}
                      tone={(["blue", "yellow", "green"] as const)[index % 3]}
                      isSaved={savedIds.has(match.job.id)}
                      onSave={() =>
                        savedIds.has(match.job.id)
                          ? handleUnsave(match.job.id)
                          : handleSave(match.job.id)
                      }
                      onOpen={() => router.push(`/job/${match.job.id}` as any)}
                    />
                  ))}
                </ScrollView>
                <View style={styles.scrollHint}>
                  <View style={styles.scrollDots}>
                    {leadMatches.map((match, index) => (
                      <TouchableOpacity
                        key={match.job.id}
                        onPress={() => selectFeaturedMatch(index)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Afficher l'offre ${index + 1} sur ${leadMatches.length}`}
                        style={[
                          index === safeFeaturedIndex ? styles.scrollDotActive : styles.scrollDot,
                          { backgroundColor: index === safeFeaturedIndex ? colors.primary : "#D1D2D5" },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.scrollHintText, { color: colors.mutedForeground }]}>Glissez pour découvrir</Text>
                </View>
                {visibleMatches.length > 1 && (
                  <View style={styles.timelineHeading}>
                    <Text style={[styles.timelineTitle, { color: colors.foreground }]}>Fil des opportunités</Text>
                    <Text style={[styles.timelineCount, { color: colors.mutedForeground }]}>
                      {Math.max(0, visibleMatches.length - 1)} offres
                    </Text>
                  </View>
                )}
                </>
              ) : null}
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === "premium-gate") {
              return <PremiumGateCard lockedCount={item.lockedCount} />;
            }
            return (
              <HomePeriod label={item.label} count={item.matches.length}>
                {item.matches.map((match) => (
                  <HomeOpportunityRow
                    key={match.job.id}
                    job={match.job}
                    fitScore={match.fitScore}
                    isSaved={savedIds.has(match.job.id)}
                    onSave={() =>
                      savedIds.has(match.job.id)
                        ? handleUnsave(match.job.id)
                        : handleSave(match.job.id)
                    }
                    onOpen={() => router.push(`/job/${match.job.id}` as any)}
                  />
                ))}
              </HomePeriod>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  homeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  eyebrow: { fontFamily: "Geist_500Medium", fontSize: 14, letterSpacing: -0.14 },
  greeting: { marginTop: 4, fontFamily: "Geist_700Bold", fontSize: 22, letterSpacing: -0.33 },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 20,
    overflow: "visible",
  },
  profileButtonGradient: {
    width: 50,
    height: 50,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  profileButtonImage: {
    width: 50,
    height: 50,
    borderRadius: 20,
  },
  profileNotification: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderWidth: 2,
    borderRadius: 5,
    backgroundColor: HOME_COLORS.notification,
  },
  homeListHeader: { paddingTop: 8 },
  searchRow: { marginBottom: 28 },
  searchBar: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontFamily: "Geist_500Medium",
    fontSize: 15,
  },
  bestMatchHeading: {
    fontFamily: "Geist_600SemiBold",
    fontSize: 16,
    letterSpacing: -0.16,
    marginBottom: 16,
  },
  featuredList: { gap: 16, paddingBottom: 2 },
  featuredCardShell: {
    width: FEATURED_CARD_WIDTH,
    height: 210,
    borderRadius: 24,
    overflow: "hidden",
  },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
    height: 210,
    padding: 20,
    borderRadius: 24,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  cardSparkle: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  cardSparkleOne: { top: 28, left: 42 },
  cardSparkleTwo: { top: 68, left: 82 },
  cardSparkleThree: { top: 86, right: 42, opacity: 0.7 },
  featuredCardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  featuredCompanyMark: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  featuredCompanyLogo: { width: "100%", height: "100%", borderRadius: 11 },
  featuredCompanyInitial: { fontFamily: "Geist_700Bold", fontSize: 22 },
  featuredCardActions: { alignItems: "flex-end", gap: 7 },
  matchBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  matchBadgeScore: { color: "#FFFFFF", fontFamily: "Geist_700Bold", fontSize: 16, letterSpacing: -0.4 },
  matchBadgeLabel: { color: "rgba(255,255,255,0.85)", fontFamily: "Geist_700Bold", fontSize: 8, letterSpacing: 0.6 },
  featuredCardCopy: { marginTop: 12 },
  featuredCardTitle: { color: "#FFFFFF", fontFamily: "Geist_600SemiBold", fontSize: 16, lineHeight: 21, letterSpacing: -0.16 },
  featuredCardCompany: { marginTop: 2, color: "rgba(255,255,255,0.75)", fontFamily: "Geist_500Medium", fontSize: 14, letterSpacing: -0.14 },
  featuredTagsViewport: { marginTop: 10, overflow: "hidden" },
  featuredTags: { flexDirection: "row", gap: 8 },
  featuredTag: { flexShrink: 0, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.15)" },
  featuredTagText: { color: "rgba(255,255,255,0.95)", fontFamily: "Geist_400Regular", fontSize: 11 },
  featuredLocation: { flexDirection: "row", alignItems: "center", gap: 5 },
  featuredLocationText: { flex: 1, color: "rgba(255,255,255,0.9)", fontFamily: "Geist_500Medium", fontSize: 13, letterSpacing: -0.13 },
  scrollHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingTop: 11 },
  scrollDots: { flexDirection: "row", alignItems: "center", gap: 5 },
  scrollDot: { width: 5, height: 5, borderRadius: 3 },
  scrollDotActive: { width: 16, height: 5, borderRadius: 999 },
  scrollHintText: { fontFamily: "Geist_400Regular", fontSize: 10 },
  timelineHeading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingTop: 28,
    paddingBottom: 12,
  },
  timelineTitle: { fontFamily: "Geist_600SemiBold", fontSize: 16, letterSpacing: -0.16 },
  timelineCount: { fontFamily: "Geist_400Regular", fontSize: 11 },
  period: { position: "relative", paddingLeft: 20, paddingBottom: 10 },
  periodRail: { position: "absolute", left: 4, top: 10, bottom: 10, width: 1 },
  periodHeading: { flexDirection: "row", alignItems: "baseline", gap: 8, paddingBottom: 4, minHeight: 18 },
  periodDot: { position: "absolute", left: -20, top: 3, width: 9, height: 9, borderWidth: 2, borderRadius: 5 },
  periodLabel: { fontFamily: "Geist_700Bold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  opportunityRow: {
    minHeight: 98,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 3,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  opportunityTapArea: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  rowCompanyMark: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  rowCompanyLogo: { width: "100%", height: "100%", borderRadius: 8 },
  rowCompanyInitial: { fontFamily: "Geist_700Bold", fontSize: 14 },
  opportunityCopy: { flex: 1, minWidth: 0, gap: 4 },
  opportunityCompany: { fontFamily: "Geist_600SemiBold", fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase" },
  opportunityTitle: { fontFamily: "Geist_600SemiBold", fontSize: 14, lineHeight: 18 },
  opportunityMetaLine: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  opportunityMeta: { flex: 1, fontFamily: "Geist_400Regular", fontSize: 10 },
  opportunityDate: { flexShrink: 0, fontFamily: "Geist_400Regular", fontSize: 9 },
  opportunitySkills: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, paddingTop: 2 },
  opportunitySkillChip: { maxWidth: 110, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderRadius: 6 },
  opportunitySkillText: { fontFamily: "Geist_400Regular", fontSize: 9 },
  rowSaveButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  loadingText: { fontFamily: "Geist_400Regular", fontSize: 14, marginTop: 12 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: "Geist_600SemiBold", fontSize: 18, textAlign: "center" },
  emptyDesc: {
    fontFamily: "Geist_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  btn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  btnText: { fontFamily: "Geist_600SemiBold", fontSize: 15 },
});
