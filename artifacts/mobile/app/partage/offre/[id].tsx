import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGetPublicJobSharePreview } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { formatRelativeJobDate } from "@/lib/jobDates";
import { purgeUnavailableJob } from "@/lib/jobCache";
import { useQueryClient } from "@tanstack/react-query";

export default function PublicJobShareScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = Number(id);
  const {
    data: job,
    error: jobRequestError,
    isLoading,
    isError,
  } = useGetPublicJobSharePreview(jobId);
  const topPadding = Platform.OS === "web" ? 67 : 24;
  const relativeDate = formatRelativeJobDate(job ?? {});

  useEffect(() => {
    const status = (jobRequestError as { status?: number } | null)?.status;
    if (jobId > 0 && status === 404) {
      purgeUnavailableJob(queryClient, jobId);
    }
  }, [jobId, jobRequestError, queryClient]);

  function openJobInApp() {
    router.push(`/job/${jobId}` as any);
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Offre Jobagogo" }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Chargement de l’opportunité…
        </Text>
      </View>
    );
  }

  if (isError || !job) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Offre indisponible" }} />
        <View style={[styles.errorIcon, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="briefcase" size={26} color={colors.primary} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          Cette offre n’est plus disponible
        </Text>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          Elle a peut-être expiré ou a été retirée de Jobagogo.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/")}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
            Découvrir Jobagogo
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: `${job.title} — Jobagogo` }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <Image
            source={require("../../../assets/images/jobagogo-logo-header-final.png")}
            style={styles.brandLogo}
            resizeMode="contain"
            accessibilityLabel="Jobagogo"
          />
          <View style={[styles.sharedBadge, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="send" size={13} color={colors.primary} />
            <Text style={[styles.sharedBadgeText, { color: colors.primary }]}>
              Offre partagée
            </Text>
          </View>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.companyRow}>
            <View
              style={[
                styles.companyLogo,
                { backgroundColor: colors.primary + "18", borderColor: colors.primary + "35" },
              ]}
            >
              {job.logoUrl ? (
                <Image
                  source={{ uri: job.logoUrl }}
                  style={styles.companyLogoImage}
                  resizeMode="cover"
                  accessibilityLabel={`Logo de ${job.company}`}
                />
              ) : (
                <Text style={[styles.companyInitial, { color: colors.primary }]}>
                  {job.company.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.companyInfo}>
              <Text style={[styles.company, { color: colors.mutedForeground }]} numberOfLines={1}>
                {job.company}
              </Text>
              <Text style={[styles.title, { color: colors.foreground }]}>{job.title}</Text>
            </View>
          </View>

          <View style={styles.chips}>
            <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
              <Feather name="map-pin" size={13} color={colors.mutedForeground} />
              <Text style={[styles.chipText, { color: colors.secondaryForeground }]}>
                {job.location}
              </Text>
            </View>
            {job.remote && (
              <View style={[styles.chip, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="wifi" size={13} color={colors.primary} />
                <Text style={[styles.chipText, { color: colors.primary }]}>Remote</Text>
              </View>
            )}
            <View style={[styles.chip, { backgroundColor: colors.primary }]}>
              <Text style={[styles.jobType, { color: colors.primaryForeground }]}>{job.jobType}</Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <Feather name="clock" size={13} color={colors.mutedForeground} />
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
              {relativeDate ? `Publiée ${relativeDate.toLowerCase()}` : "Opportunité récente"}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Pourquoi cette offre mérite ton attention
            </Text>
            {job.isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="check-circle" size={14} color={colors.primary} />
                <Text style={[styles.verifiedText, { color: colors.primary }]}>Vérifiée</Text>
              </View>
            )}
          </View>
          <Text style={[styles.summary, { color: colors.secondaryForeground }]}>{job.summary}</Text>
        </View>

        {job.skills.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Compétences recherchées
            </Text>
            <View style={styles.skills}>
              {job.skills.map((skill) => (
                <View key={skill} style={[styles.skillChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.skillText, { color: colors.secondaryForeground }]}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.premiumCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "40" }]}>
          <View style={[styles.lockIcon, { backgroundColor: colors.primary }]}>
            <Feather name="lock" size={16} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.premiumTitle, { color: colors.foreground }]}>
            Les informations complètes sont dans Jobagogo
          </Text>
          <Text style={[styles.premiumText, { color: colors.mutedForeground }]}>
            Découvre la description complète, les détails de candidature et l’analyse de compatibilité avec Premium.
          </Text>
          <TouchableOpacity
            onPress={openJobInApp}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
              Voir l’offre complète
            </Text>
            <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>
          Jobagogo aide les talents d’Afrique francophone à trouver des opportunités qui leur correspondent.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
  loadingText: { fontFamily: "Geist_400Regular", fontSize: 14 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 12, maxWidth: 760, width: "100%" as any, alignSelf: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 36, marginBottom: 8 },
  brandLogo: { width: 128, height: 32 },
  sharedBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20 },
  sharedBadgeText: { fontFamily: "Geist_600SemiBold", fontSize: 11 },
  heroCard: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 14 },
  companyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  companyLogo: { width: 54, height: 54, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  companyLogoImage: { width: "100%", height: "100%", borderRadius: 13 },
  companyInitial: { fontFamily: "Geist_700Bold", fontSize: 24 },
  companyInfo: { flex: 1, gap: 4, minWidth: 0 },
  company: { fontFamily: "Geist_500Medium", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase" },
  title: { fontFamily: "Geist_700Bold", fontSize: 22, lineHeight: 28 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  chipText: { fontFamily: "Geist_500Medium", fontSize: 12 },
  jobType: { fontFamily: "Geist_700Bold", fontSize: 11 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { fontFamily: "Geist_400Regular", fontSize: 12 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  sectionTitle: { flex: 1, fontFamily: "Geist_600SemiBold", fontSize: 16, lineHeight: 21 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20 },
  verifiedText: { fontFamily: "Geist_600SemiBold", fontSize: 10 },
  summary: { fontFamily: "Geist_400Regular", fontSize: 14, lineHeight: 22 },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skillChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  skillText: { fontFamily: "Geist_500Medium", fontSize: 12 },
  premiumCard: { borderRadius: 16, borderWidth: 1.5, padding: 18, gap: 11 },
  lockIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  premiumTitle: { fontFamily: "Geist_700Bold", fontSize: 17, lineHeight: 22 },
  premiumText: { fontFamily: "Geist_400Regular", fontSize: 13, lineHeight: 20 },
  primaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, marginTop: 3 },
  primaryButtonText: { fontFamily: "Geist_700Bold", fontSize: 14 },
  footerNote: { fontFamily: "Geist_400Regular", fontSize: 12, lineHeight: 18, textAlign: "center", paddingHorizontal: 22, paddingTop: 8 },
  errorIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  errorTitle: { fontFamily: "Geist_700Bold", fontSize: 20, textAlign: "center" },
  errorText: { fontFamily: "Geist_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center" },
});