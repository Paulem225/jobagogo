import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSaved,
  getListSavedQueryKey,
  useUnsaveJob,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { JobCard } from "@/components/JobCard";

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: savedJobs, isLoading } = useListSaved({
    query: { queryKey: getListSavedQueryKey() },
  });
  const unsaveJob = useUnsaveJob();

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: topPadding,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Sauvegardés</Text>
        {savedJobs && savedJobs.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>
              {savedJobs.length}
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={savedJobs ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: bottomPadding,
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="bookmark" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Aucune offre sauvegardée
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Sauvegardez les offres qui vous intéressent depuis le feed ou une fiche offre
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <JobCard
              job={item.job!}
              isSaved
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
  headerBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerTitle: {
    fontFamily: "Geist_700Bold",
    fontSize: 24,
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
  },
  countText: {
    fontFamily: "Geist_600SemiBold",
    fontSize: 13,
  },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontFamily: "Geist_600SemiBold", fontSize: 18, textAlign: "center" },
  emptyDesc: {
    fontFamily: "Geist_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
