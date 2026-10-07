import React, { useState, useCallback, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Keyboard,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  listJobs,
  useListSaved,
  getListSavedQueryKey,
  useSaveJob,
  useUnsaveJob,
  useGetJobStats,
  getGetJobStatsQueryKey,
} from "@workspace/api-client-react";
import { JOB_CATEGORIES } from "@workspace/job-categories";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { JobCard } from "@/components/JobCard";

const JOBS_PAGE_SIZE = 50;
const RECENT_SEARCHES_KEY = "@jobagogo/recent-searches";
const SEARCH_COLORS = {
  background: "#0B0C14",
  foreground: "#DADADB",
  muted: "#7A7C85",
  placeholder: "#AFB0B6",
  primary: "#0E9D57",
  divider: "#20212A",
} as const;

const FALLBACK_SUGGESTIONS = [
  "UX Design",
  "UX Designer",
  "UX Design Lead",
  "UX Developer",
  "UX Design Director",
  "UX Design Researcher",
  "UX Developer Lead",
  "UX Researcher",
  "UX Testing",
  "Product Designer",
  "Product Manager",
  "Software Engineer",
  "Full-Stack Developer",
  "Marketing Manager",
  "SEO Specialist",
];

function HighlightedSuggestion({ suggestion, query }: { suggestion: string; query: string }) {
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const matchStart = suggestion.toLocaleLowerCase("fr").indexOf(normalizedQuery);

  if (matchStart < 0 || normalizedQuery.length === 0) {
    return <Text style={styles.suggestionText}>{suggestion}</Text>;
  }

  const matchEnd = matchStart + query.trim().length;
  return (
    <Text style={styles.suggestionText}>
      <Text style={styles.suggestionMuted}>{suggestion.slice(0, matchStart)}</Text>
      <Text style={styles.suggestionHighlight}>{suggestion.slice(matchStart, matchEnd)}</Text>
      <Text style={styles.suggestionMuted}>{suggestion.slice(matchEnd)}</Text>
    </Text>
  );
}

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const {
    mode: initialModeParam,
    origin: initialOriginParam,
    search: initialSearchParam,
    submitted: initialSubmittedParam,
  } = useLocalSearchParams<{ mode?: string; origin?: string; search?: string; submitted?: string }>();
  const initialSearch = typeof initialSearchParam === "string" ? initialSearchParam : "";
  const [search, setSearch] = useState(initialSearch);
  const [searchSubmitted, setSearchSubmitted] = useState(
    initialSubmittedParam === "1" && initialSearch.trim().length > 0,
  );
  const [searchMode, setSearchMode] = useState(initialModeParam === "search");
  const [searchOrigin, setSearchOrigin] = useState<"home" | "discover">(
    initialOriginParam === "home" ? "home" : "discover",
  );
  const [activeCategory, setActiveCategory] = useState<(typeof JOB_CATEGORIES)[number] | null>(null);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const tabNavigation = navigation as any;
    return tabNavigation.addListener("tabPress", () => {
      setSearch("");
      setSearchSubmitted(false);
      setSearchMode(false);
      setSearchOrigin("discover");
      setActiveCategory(null);
      setRemoteOnly(false);
    });
  }, [navigation]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((stored) => {
        if (!mounted || !stored) return;
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter((item): item is string => typeof item === "string").slice(0, 6));
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (initialModeParam !== "search" && initialSubmittedParam !== "1") {
        setSearchMode(false);
        setSearchSubmitted(false);
      }
    }, [initialModeParam, initialSubmittedParam]),
  );

  useEffect(() => {
    const nextSearch = typeof initialSearchParam === "string" ? initialSearchParam : "";
    const shouldSubmit = initialSubmittedParam === "1" && nextSearch.trim().length > 0;
    const shouldOpenSearch = initialModeParam === "search";

    if (shouldSubmit) {
      setSearch(nextSearch);
      setSearchSubmitted(true);
      setSearchMode(true);
      setSearchOrigin(initialOriginParam === "home" ? "home" : "discover");
    } else if (initialSubmittedParam === "0") {
      setSearch(nextSearch);
      setSearchSubmitted(false);
      setSearchMode(shouldOpenSearch);
      setSearchOrigin(initialOriginParam === "home" ? "home" : "discover");
    }
  }, [initialModeParam, initialOriginParam, initialSearchParam, initialSubmittedParam]);

  const searchTerm = search.trim();
  const isSearchResults = searchSubmitted && (searchTerm.length > 0 || activeCategory !== null);
  const isSearchScreen = searchMode && !isSearchResults;
  const querySearchTerm = isSearchResults ? searchTerm : "";
  const {
    data: jobsPages,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchJobs,
  } = useInfiniteQuery({
    queryKey: ["discover-jobs", querySearchTerm, activeCategory],
    refetchOnMount: "always",
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      listJobs(
        {
          ...(querySearchTerm ? { search: querySearchTerm } : {}),
          ...(activeCategory && !querySearchTerm ? { category: activeCategory } : {}),
          limit: JOBS_PAGE_SIZE,
          offset: pageParam,
        },
        { signal },
      ),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < JOBS_PAGE_SIZE ? undefined : allPages.length * JOBS_PAGE_SIZE,
  });
  const { data: jobStats } = useGetJobStats({
    query: { queryKey: getGetJobStatsQueryKey() },
  });

  useFocusEffect(
    useCallback(() => {
      void refetchJobs();
      void queryClient.invalidateQueries({ queryKey: getGetJobStatsQueryKey() });
    }, [queryClient, refetchJobs]),
  );

  const jobs = useMemo(() => jobsPages?.pages.flat() ?? [], [jobsPages]);

  const { data: savedJobs } = useListSaved({ query: { queryKey: getListSavedQueryKey() } });
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();
  const savedIds = new Set((savedJobs ?? []).map((s) => s.jobId));

  const recentJobs = jobs;

  const filteredJobs = recentJobs.filter((job) => !remoteOnly || job.remote);
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of jobStats?.categoryBreakdown ?? []) {
      counts[item.category] = item.count;
    }
    return counts;
  }, [jobStats]);
  const suggestionOptions = useMemo(() => {
    const uniqueSuggestions = new Map<string, string>();
    for (const suggestion of [
      ...recentJobs.map((job) => job.title),
      ...FALLBACK_SUGGESTIONS,
    ]) {
      const cleanSuggestion = suggestion?.trim();
      if (!cleanSuggestion) continue;
      uniqueSuggestions.set(cleanSuggestion.toLocaleLowerCase("fr"), cleanSuggestion);
    }
    return [...uniqueSuggestions.values()];
  }, [recentJobs]);
  const matchingSuggestions = useMemo(() => {
    if (!searchTerm) return [];
    const normalizedSearch = searchTerm.toLocaleLowerCase("fr");
    return suggestionOptions
      .filter((suggestion) => suggestion.toLocaleLowerCase("fr").includes(normalizedSearch))
      .slice(0, 20);
  }, [searchTerm, suggestionOptions]);
  const popularCategories = useMemo(() => {
    const availableCategories = JOB_CATEGORIES.filter((category) => category !== "Autres");
    return [...availableCategories]
      .sort((a, b) => (categoryCounts[b] ?? 0) - (categoryCounts[a] ?? 0))
      .slice(0, 9);
  }, [categoryCounts]);

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

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchJobs(),
      queryClient.invalidateQueries({ queryKey: getGetJobStatsQueryKey() }),
    ]);
  }, [queryClient, refetchJobs]);

  const rememberSearch = useCallback((value: string) => {
    setRecentSearches((current) => {
      const next = [value, ...current.filter((item) => item.toLocaleLowerCase("fr") !== value.toLocaleLowerCase("fr"))].slice(0, 6);
      void AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const submitSearch = useCallback((nextSearch?: string) => {
    const value = (nextSearch ?? search).trim();
    if (!value) return;
    setSearch(value);
    setActiveCategory(null);
    setSearchSubmitted(true);
    rememberSearch(value);
    Keyboard.dismiss();
  }, [rememberSearch, search]);

  const submitCategorySearch = useCallback((category: (typeof JOB_CATEGORIES)[number]) => {
    setSearch("");
    setActiveCategory(category);
    setSearchSubmitted(true);
    setSearchMode(false);
    rememberSearch(category);
    Keyboard.dismiss();
  }, [rememberSearch]);

  const openSearchFromBrowse = useCallback(() => {
    setSearch("");
    setSearchSubmitted(false);
    setSearchMode(true);
    setSearchOrigin("discover");
  }, []);

  const closeSearch = useCallback(() => {
    if (searchOrigin === "home") {
      router.replace("/(tabs)" as any);
      return;
    }
    setSearch("");
    setSearchSubmitted(false);
    setSearchMode(false);
  }, [router, searchOrigin]);

  const returnFromResults = useCallback(() => {
    setActiveCategory(null);
    setSearchSubmitted(false);
    setSearchMode(searchOrigin === "home");
  }, [searchOrigin]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top + 16;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;
  const resultCountLabel = `${filteredJobs.length} offre${filteredJobs.length > 1 ? "s" : ""} trouvée${
    filteredJobs.length > 1 ? "s" : ""
  }`;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isSearchScreen ? SEARCH_COLORS.background : colors.background },
      ]}
    >
      <View
        style={[
          styles.searchHeader,
          {
            paddingTop: topPadding,
            backgroundColor: isSearchScreen ? SEARCH_COLORS.background : colors.background,
            borderBottomColor: isSearchScreen ? SEARCH_COLORS.divider : colors.border,
          },
        ]}
      >
        {isSearchResults ? (
          <View style={styles.resultsTitleRow}>
            <TouchableOpacity
              onPress={returnFromResults}
              accessibilityRole="button"
              accessibilityLabel="Modifier la recherche"
            >
              <Feather name="chevron-left" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.resultsTitle, { color: colors.foreground }]} numberOfLines={1}>
              {searchTerm || activeCategory}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSearch("");
                setSearchSubmitted(false);
                setActiveCategory(null);
                setSearchMode(searchOrigin === "home");
              }}
              accessibilityRole="button"
              accessibilityLabel="Effacer la recherche"
            >
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ) : isSearchScreen ? (
          <>
            <View style={styles.searchScreenTitleRow}>
              <TouchableOpacity
                onPress={closeSearch}
                accessibilityRole="button"
                accessibilityLabel="Fermer la recherche"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={24} color={SEARCH_COLORS.foreground} />
              </TouchableOpacity>
              <Text style={styles.searchScreenTitle}>Recherche</Text>
              <View style={styles.searchTitleSpacer} />
            </View>
            <View style={styles.darkSearchBar}>
              <Feather name="search" size={18} color={SEARCH_COLORS.placeholder} />
              <TextInput
                style={styles.darkSearchInput}
                placeholder="Rechercher un poste ou une fonction"
                placeholderTextColor={SEARCH_COLORS.placeholder}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => submitSearch()}
                returnKeyType="search"
                accessibilityLabel="Rechercher un poste ou une entreprise"
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} accessibilityLabel="Effacer la saisie">
                  <Feather name="x" size={16} color={SEARCH_COLORS.placeholder} />
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Découvrir</Text>
            <TouchableOpacity
              style={[styles.browseSearchBar, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={openSearchFromBrowse}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Rechercher un poste ou une entreprise"
            >
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <Text style={[styles.browseSearchPlaceholder, { color: colors.mutedForeground }]}>
                Rechercher un poste, une entreprise...
              </Text>
            </TouchableOpacity>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryFilters}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { borderColor: !activeCategory ? colors.primary : colors.border },
                  !activeCategory && { backgroundColor: colors.primary + "20" },
                ]}
                onPress={() => setActiveCategory(null)}
              >
                <Text style={[styles.filterText, { color: !activeCategory ? colors.primary : colors.mutedForeground }]}>
                  Toutes
                </Text>
              </TouchableOpacity>
              {JOB_CATEGORIES.filter((category) => categoryCounts[category] > 0).map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterChip,
                    { borderColor: activeCategory === category ? colors.primary : colors.border },
                    activeCategory === category && { backgroundColor: colors.primary + "20" },
                  ]}
                  onPress={() => setActiveCategory(activeCategory === category ? null : category)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: activeCategory === category ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    {category} · {categoryCounts[category] ?? 0}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.filters}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { borderColor: remoteOnly ? colors.primary : colors.border },
                  remoteOnly && { backgroundColor: colors.primary + "20" },
                ]}
                onPress={() => setRemoteOnly((current) => !current)}
              >
                <Text style={[styles.filterText, { color: remoteOnly ? colors.primary : colors.mutedForeground }]}>
                  À distance
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        {isSearchResults && (
          <View style={styles.resultsToolbar}>
            <Text style={[styles.resultsCount, { color: colors.primary }]}>{resultCountLabel}</Text>
          </View>
        )}
      </View>

      {isSearchScreen ? (
        searchTerm.length > 0 ? (
          <FlatList
            data={matchingSuggestions}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={styles.suggestionsContent}
            ListEmptyComponent={
              <Text style={styles.noSuggestions}>Aucune suggestion correspondante</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionRow}
                onPress={() => submitSearch(item)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Rechercher ${item}`}
              >
                <HighlightedSuggestion suggestion={item} query={searchTerm} />
              </TouchableOpacity>
            )}
          />
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.searchIdleContent}
          >
            <View style={styles.searchSection}>
              <Text style={styles.searchSectionTitle}>Recherches récentes</Text>
              {recentSearches.length > 0 ? (
                <View style={styles.searchChipList}>
                  {recentSearches.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.searchChip}
                      onPress={() => submitSearch(item)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.searchChipText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.searchEmptyText}>Vous n’avez encore aucun historique de recherche</Text>
              )}
            </View>
            <View style={styles.popularCategoriesSection}>
              <Text style={styles.searchSectionTitle}>Catégories populaires</Text>
              <View style={styles.searchChipList}>
                {popularCategories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={styles.searchChip}
                    onPress={() => submitCategorySearch(category)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.searchChipText}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        )
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: bottomPadding }}
          refreshing={isRefetching}
          onRefresh={() => {
            void handleRefresh();
          }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadMoreText, { color: colors.mutedForeground }]}>
                  Chargement d’autres offres…
                </Text>
              </View>
            ) : null
          }
          ListHeaderComponent={
            !isSearchResults && filteredJobs.length > 0 ? (
              <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
                Offres disponibles
                {jobStats ? ` · ${jobStats.totalJobs} offre${jobStats.totalJobs > 1 ? "s" : ""}` : ""}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="search" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucun résultat</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Essayez un autre intitulé ou une autre entreprise
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <JobCard
              job={item}
              isSaved={savedIds.has(item.id)}
              onSave={handleSave}
              onUnsave={handleUnsave}
              showScore={false}
            />
          )}
        />
      )}
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchScreenTitleRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  searchScreenTitle: {
    color: SEARCH_COLORS.foreground,
    fontFamily: "Geist_600SemiBold",
    fontSize: 16,
    letterSpacing: -0.16,
  },
  searchTitleSpacer: {
    width: 24,
  },
  headerTitle: {
    fontFamily: "Geist_700Bold",
    fontSize: 24,
    letterSpacing: -0.5,
  },
  browseSearchBar: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
  },
  browseSearchPlaceholder: {
    flex: 1,
    fontFamily: "Geist_400Regular",
    fontSize: 14,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryFilters: {
    gap: 6,
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: "Geist_500Medium",
    fontSize: 12,
  },
  darkSearchBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 0,
    marginHorizontal: 16,
    paddingHorizontal: 0,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#444550",
  },
  darkSearchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: SEARCH_COLORS.foreground,
    fontFamily: "Geist_400Regular",
    fontSize: 15,
  },
  suggestionsContent: {
    paddingTop: 6,
    paddingBottom: 40,
  },
  suggestionRow: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  suggestionText: {
    color: SEARCH_COLORS.foreground,
    fontFamily: "Geist_400Regular",
    fontSize: 15,
    letterSpacing: -0.15,
  },
  suggestionMuted: {
    color: SEARCH_COLORS.muted,
  },
  suggestionHighlight: {
    color: SEARCH_COLORS.foreground,
    fontFamily: "Geist_600SemiBold",
  },
  noSuggestions: {
    paddingHorizontal: 24,
    paddingTop: 10,
    color: SEARCH_COLORS.muted,
    fontFamily: "Geist_400Regular",
    fontSize: 14,
  },
  searchIdleContent: {
    paddingHorizontal: 32,
    paddingTop: 34,
    paddingBottom: 40,
  },
  searchSection: {
    gap: 12,
  },
  searchSectionTitle: {
    color: SEARCH_COLORS.foreground,
    fontFamily: "Geist_700Bold",
    fontSize: 20,
    letterSpacing: -0.25,
  },
  searchEmptyText: {
    color: SEARCH_COLORS.muted,
    fontFamily: "Geist_400Regular",
    fontSize: 16,
  },
  popularCategoriesSection: {
    gap: 18,
    marginTop: 48,
  },
  searchChipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  searchChip: {
    minHeight: 42,
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#30313D",
    backgroundColor: "#171822",
    paddingHorizontal: 16,
  },
  searchChipText: {
    color: "#BFC0C8",
    fontFamily: "Geist_400Regular",
    fontSize: 14,
  },
  resultsTitleRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultsTitle: {
    flex: 1,
    marginHorizontal: 16,
    fontFamily: "Geist_600SemiBold",
    fontSize: 18,
    textAlign: "center",
  },
  resultsToolbar: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultsCount: {
    fontFamily: "Geist_600SemiBold",
    fontSize: 15,
  },
  resultCount: {
    fontFamily: "Geist_400Regular",
    fontSize: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  loadMoreText: {
    fontFamily: "Geist_400Regular",
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: "Geist_600SemiBold",
    fontSize: 16,
  },
  emptyDesc: {
    fontFamily: "Geist_400Regular",
    fontSize: 13,
    textAlign: "center",
  },
});
