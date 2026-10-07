import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Modal,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetJob,
  getGetJobQueryKey,
  useGetMatches,
  getGetMatchesQueryKey,
  useListSaved,
  getListSavedQueryKey,
  useSaveJob,
  useUnsaveJob,
  useGetProfile,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { formatRelativeJobDate } from "@/lib/jobDates";
import Svg, { Path, Circle, Rect } from "react-native-svg";

import { useColors } from "@/hooks/useColors";
import { FitScoreRing } from "@/components/FitScoreRing";
import { PremiumModal } from "@/components/PremiumGate";
import { getJobShareMessage, getPublicJobUrl } from "@/lib/jobSharing";
import { purgeUnavailableJob } from "@/lib/jobCache";

type DetailTab = "Description" | "Exigences" | "À propos";
const detailTabs: DetailTab[] = ["Description", "Exigences", "À propos"];
const detailGreen = "#0E9D57";
const detailGreenDark = "#087B43";

// Premium status is read from the user's profile

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.scoreBarRow}>
      <Text style={[styles.scoreBarLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.scoreBarRight}>
        <View style={[styles.scoreBarTrack, { backgroundColor: colors.secondary }]}>
          <View style={[styles.scoreBarFill, { width: `${value}%` as any, backgroundColor: color }]} />
        </View>
        <Text style={[styles.scoreBarValue, { color: colors.foreground }]}>{value}%</Text>
      </View>
    </View>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#F59E0B";
  return "#DC4444";
}

function PremiumLockSection({ onUpgrade }: { onUpgrade: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.lockSection, { backgroundColor: colors.card, borderColor: "#55CD6C40" }]}>
      {/* Top row: icon + label */}
      <View style={styles.lockTopRow}>
        <View style={[styles.lockIcon, { backgroundColor: "#55CD6C20", borderColor: "#55CD6C50" }]}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Rect x={3} y={11} width={18} height={11} rx={2} stroke="#55CD6C" strokeWidth={2} />
            <Path d="M7 11V7a5 5 0 0110 0v4" stroke="#55CD6C" strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </View>
        <Text style={[styles.lockTitle, { color: colors.foreground }]}>Contenu Premium</Text>
      </View>

      {/* Description */}
      <Text style={[styles.lockDesc, { color: colors.mutedForeground }]}>
        Débloquez la source et le lien de candidature directement depuis l'offre.
      </Text>

      {/* CTA full width */}
      <TouchableOpacity
        style={[styles.lockCTA, { backgroundColor: "#55CD6C" }]}
        onPress={onUpgrade}
        activeOpacity={0.85}
      >
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
          <Rect x={3} y={11} width={18} height={11} rx={2} stroke="#0A0A0A" strokeWidth={2.2} />
          <Path d="M7 11V7a5 5 0 0110 0v4" stroke="#0A0A0A" strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
        <Text style={styles.lockCTAText}>Débloquer avec Premium</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = parseInt(id ?? "0", 10);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [fullPremiumVisible, setFullPremiumVisible] = useState(false);
  const [companyLogoError, setCompanyLogoError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("Exigences");
  const { data: profile } = useGetProfile();
  const isPremium = profile?.isPremium ?? false;

  const {
    data: job,
    error: jobRequestError,
    isLoading: jobLoading,
    isError: jobError,
  } = useGetJob(jobId, {
    query: { queryKey: getGetJobQueryKey(jobId), enabled: !!jobId },
  });

  useEffect(() => {
    const status = (jobRequestError as { status?: number } | null)?.status;
    if (jobId > 0 && status === 404) {
      purgeUnavailableJob(queryClient, jobId);
    }
  }, [jobId, jobRequestError, queryClient]);

  const matchParams = jobId ? { jobId } : undefined;
  const { data: matches } = useGetMatches(matchParams, {
    query: { queryKey: getGetMatchesQueryKey(matchParams), enabled: !!jobId },
  });

  const { data: savedJobs } = useListSaved({ query: { queryKey: getListSavedQueryKey() } });
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();

  const match = matches?.find((m) => m.job.id === jobId);
  const isSaved = (savedJobs ?? []).some((s) => s.jobId === jobId);

  const handleToggleSave = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isSaved) {
      unsaveJob.mutate(
        { jobId },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSavedQueryKey() }) }
      );
    } else {
      saveJob.mutate(
        { data: { jobId } },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSavedQueryKey() }) }
      );
    }
  }, [isSaved, jobId, saveJob, unsaveJob, queryClient]);

  const handleShare = useCallback(async () => {
    if (!job || sharing) return;
    setSharing(true);
    try {
      await Share.share({
        title: `${job.title} — ${job.company}`,
        message: getJobShareMessage(
          {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
          },
          { includeUrl: Platform.OS !== "ios" },
        ),
        url: Platform.OS === "ios" ? getPublicJobUrl(job.id) : undefined,
      });
    } finally {
      setSharing(false);
    }
  }, [job, sharing]);

  const handleApply = useCallback(() => {
    if (!isPremium) {
      setPremiumModalVisible(true);
      return;
    }
    if (job?.sourceUrl) {
      void Linking.openURL(job.sourceUrl);
    }
  }, [isPremium, job?.sourceUrl]);

  const topPadding = Platform.OS === "web" ? 16 : insets.top + 4;
  const bottomPadding = Platform.OS === "web" ? 124 : insets.bottom + 112;

  if (jobLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (jobError || !job) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>Cette offre n’est plus disponible</Text>
      </View>
    );
  }

  const relativeDate = formatRelativeJobDate(job as any);
  const requirements = [
    job.diplomaRequired ? `${job.diplomaRequired} minimum ou formation équivalente.` : null,
    job.experienceYears
      ? `${job.experienceYears} an${job.experienceYears > 1 ? "s" : ""} d'expérience dans un environnement similaire.`
      : "Une première expérience dans un environnement similaire est appréciée.",
    "Être à l'aise avec les outils numériques et le travail en équipe.",
    ...job.skills.slice(0, 4).map((skill) => `Maîtriser ${skill.toLowerCase()} et savoir l'appliquer au quotidien.`),
  ].filter((item): item is string => Boolean(item));
  const about = `${job.company} recrute pour renforcer son équipe${job.sector ? ` dans le secteur ${job.sector.toLowerCase()}` : ""}. Cette offre est référencée sur ${job.source || "Jobagogo"} et proposée en ${job.jobType}.`;
  const matchReasons = match
    ? [
        { label: "Compétences", value: job.skills.slice(0, 3).join(" · ") || "Profil adapté" },
        { label: "Métier", value: `${match.titleScore}% de correspondance` },
        { label: "Expérience", value: job.experienceYears ? `${job.experienceYears} an${job.experienceYears > 1 ? "s" : ""} recommandé${job.experienceYears > 1 ? "s" : ""}` : "Profil recherché" },
        { label: "Secteur", value: job.sector || job.jobType },
      ]
    : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#1BAF6B", detailGreen]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroPattern} pointerEvents="none">
          <View style={[styles.patternDot, { top: 72, left: 42 }]} />
          <View style={[styles.patternDot, { top: 128, right: 56 }]} />
          <View style={[styles.patternDot, { top: 208, left: 88 }]} />
          <View style={[styles.patternDot, { bottom: 34, right: 112 }]} />
        </View>
        <View style={[styles.navbar, { paddingTop: topPadding }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={styles.heroIconButton}
          >
            <Feather name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.navSpacer} />
          <View style={styles.heroActions}>
            {sharing ? (
              <View style={styles.shareStatus}>
                <Text style={styles.shareStatusText}>Partage…</Text>
              </View>
            ) : null}
            <TouchableOpacity
              onPress={handleShare}
              disabled={sharing}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Partager cette offre"
              testID="share-job"
              style={styles.heroIconButton}
            >
              <Feather name="share-2" size={21} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleToggleSave}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={isSaved ? "Retirer l'offre des sauvegardes" : "Sauvegarder l'offre"}
              style={[styles.heroIconButton, isSaved && styles.heroIconButtonActive]}
            >
              <Feather name="bookmark" size={22} color="#FFFFFF" fill={isSaved ? "#FFFFFF" : "none"} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroContent}>
          <View
            style={[
              styles.companyLogo,
              {
                backgroundColor: "#FFFFFF",
                borderColor: "#FFFFFF",
              },
            ]}
          >
            {job.logoUrl && !companyLogoError ? (
              <Image
                source={{ uri: job.logoUrl }}
                style={styles.companyLogoImage}
                resizeMode="cover"
                onError={() => setCompanyLogoError(true)}
                accessibilityLabel={`Logo de ${job.company}`}
              />
            ) : (
              <Text style={[styles.companyInitial, { color: colors.primary }]}>
                {job.company.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.company}>{job.company}</Text>
          <View style={styles.tags}>
            {job.sector ? <View style={styles.tag}><Text style={styles.tagText}>{job.sector}</Text></View> : null}
            <View style={styles.tag}><Text style={styles.tagText}>{job.jobType}</Text></View>
            {job.diplomaRequired ? <View style={styles.tag}><Text style={styles.tagText}>{job.diplomaRequired}</Text></View> : null}
          </View>
          <View style={styles.heroSummary}>
            <View style={styles.summaryItem}>
              <Feather name="map-pin" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.summaryText} numberOfLines={2}>{job.location}</Text>
            </View>
            {relativeDate ? (
              <View style={styles.summaryItem}>
                <Feather name="clock" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.summaryText}>{relativeDate}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.tabs, { backgroundColor: colors.background }]} accessibilityRole="tablist">
        {detailTabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: detailGreen }]}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.foreground : colors.mutedForeground }, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPadding }} showsVerticalScrollIndicator={false}>
        {match && (
          <View style={styles.content}>
            <View style={[styles.matchCard, { backgroundColor: colors.card, borderColor: "#0E9D5730" }]}>
              <View style={styles.matchHeading}>
                <View style={styles.matchHeadingCopy}>
                  <Text style={[styles.matchKicker, { color: detailGreen }]}>Compatibilité avec votre profil</Text>
                  <Text style={[styles.matchTitle, { color: colors.foreground }]}>Pourquoi cette offre vous correspond</Text>
                </View>
                <View style={[styles.matchScore, { borderColor: detailGreen }]}>
                  <Text style={[styles.matchScoreValue, { color: detailGreen }]}>{Math.round(match.fitScore)}%</Text>
                  <Text style={[styles.matchScoreLabel, { color: detailGreen }]}>match</Text>
                </View>
              </View>
              <View style={[styles.matchReasons, { borderTopColor: "#0E9D571F" }]}>
                {matchReasons.map((reason) => (
                  <View key={reason.label} style={styles.matchReason}>
                    <View style={[styles.matchCheck, { backgroundColor: detailGreen }]}>
                      <Feather name="check" size={10} color="#FFFFFF" />
                    </View>
                    <View style={styles.matchReasonCopy}>
                      <Text style={[styles.matchReasonLabel, { color: colors.foreground }]}>{reason.label}</Text>
                      <Text style={[styles.matchReasonValue, { color: colors.mutedForeground }]} numberOfLines={2}>{reason.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={styles.content}>
          {activeTab === "Description" ? (
            <DescriptionSection
              description={job.description}
              isPremium={isPremium}
              onUpgrade={() => setPremiumModalVisible(true)}
              colors={colors}
            />
          ) : activeTab === "À propos" ? (
            <View style={[styles.detailSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>À propos de l'offre</Text>
              <Text style={[styles.description, { color: colors.secondaryForeground }]}>{about}</Text>
              <View style={styles.metaList}>
                <View style={styles.metaRow}>
                  <Feather name="globe" size={15} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Source : {job.source || "Jobagogo"}</Text>
                </View>
                {relativeDate ? (
                  <View style={styles.metaRow}>
                    <Feather name="calendar" size={15} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Publiée {relativeDate}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={[styles.detailSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ce que nous recherchons</Text>
              <View style={styles.requirementsList}>
                {requirements.map((requirement) => (
                  <View key={requirement} style={styles.requirementRow}>
                    <View style={[styles.requirementBullet, { backgroundColor: detailGreen }]} />
                    <Text style={[styles.requirementText, { color: colors.secondaryForeground }]}>{requirement}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.detailSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Compétences clés</Text>
            <View style={styles.skillsGrid}>
              {job.skills.map((skill) => (
                <View key={skill} style={[styles.skillChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.skillText, { color: colors.secondaryForeground }]}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          {!isPremium ? (
            <PremiumLockSection onUpgrade={() => setPremiumModalVisible(true)} />
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.applyWrap, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: isPremium ? detailGreen : "#55CD6C" }]}
          onPress={handleApply}
          activeOpacity={0.86}
          accessibilityRole="button"
        >
          {!isPremium ? (
            <Feather name="lock" size={15} color="#0A0A0A" />
          ) : null}
          <Text style={[styles.applyBtnText, { color: isPremium ? "#FFFFFF" : "#0A0A0A" }]}>
            {isPremium ? "Postuler maintenant" : "Postuler avec Premium"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Teaser modale → chaîne vers la vraie modale Premium */}
      <PremiumDetailModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        onFullPremium={() => {
          setPremiumModalVisible(false);
          setTimeout(() => setFullPremiumVisible(true), 300);
        }}
        colors={colors}
      />
      <PremiumModal
        visible={fullPremiumVisible}
        lockedCount={0}
        onClose={() => setFullPremiumVisible(false)}
      />
    </View>
  );
}

function DescriptionSection({
  description,
  isPremium,
  onUpgrade,
  colors,
}: {
  description: string;
  isPremium: boolean;
  onUpgrade: () => void;
  colors: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_LENGTH = 240;
  const isLong = description.length > PREVIEW_LENGTH;
  const previewText = isLong ? description.slice(0, PREVIEW_LENGTH).trim() + "…" : description;
  const displayText = expanded ? description : previewText;

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Description</Text>
      <Text style={[styles.description, { color: colors.secondaryForeground }]}>{displayText}</Text>
      {isLong && (
        <TouchableOpacity
          style={[styles.seeMoreBtn, { backgroundColor: isPremium ? colors.primary + "15" : "#55CD6C15" }]}
          onPress={() => {
            if (isPremium) {
              setExpanded((e) => !e);
            } else {
              onUpgrade();
            }
          }}
          activeOpacity={0.85}
        >
          {!isPremium && (
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
              <Rect x={3} y={11} width={18} height={11} rx={2} stroke="#55CD6C" strokeWidth={2} />
              <Path d="M7 11V7a5 5 0 0110 0v4" stroke="#55CD6C" strokeWidth={2} strokeLinecap="round" />
            </Svg>
          )}
          <Text
            style={[
              styles.seeMoreText,
              { color: isPremium ? colors.primary : "#55CD6C" },
            ]}
          >
            {isPremium ? (expanded ? "Voir moins" : "Voir plus") : "Passer en Premium"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function PremiumDetailModal({
  visible,
  onClose,
  onFullPremium,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onFullPremium: () => void;
  colors: any;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 32, textAlign: "center" }}>👑</Text>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Passez à Premium</Text>
            <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
              Accédez à la source de l'offre, au lien de candidature et à bien plus encore.
            </Text>
            <View style={[styles.priceRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>À partir de</Text>
              <Text style={[styles.priceAmount, { color: "#55CD6C" }]}>1 000 FCFA</Text>
              <Text style={[styles.priceUnit, { color: colors.mutedForeground }]}>/mois</Text>
            </View>
            <TouchableOpacity style={[styles.modalCTA, { backgroundColor: "#55CD6C" }]} onPress={onFullPremium}>
              <Text style={styles.modalCTAText}>Voir les offres Premium</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalSkip, { color: colors.mutedForeground }]}>Plus tard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontFamily: "Geist_600SemiBold", fontSize: 16 },
  hero: {
    flexGrow: 0,
    overflow: "hidden",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  patternDot: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 21,
  },
  heroIconButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  heroIconButtonActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  navSpacer: { flex: 1 },
  heroActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  shareStatus: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(5,102,55,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  shareStatusText: { color: "#FFFFFF", fontFamily: "Geist_600SemiBold", fontSize: 10 },
  heroContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 9,
    paddingBottom: 29,
  },
  companyLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#004B29",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
    overflow: "hidden",
  },
  companyInitial: { fontFamily: "Geist_700Bold", fontSize: 34, color: "#4285F4" },
  companyLogoImage: { width: "100%", height: "100%", borderRadius: 40 },
  jobTitle: {
    maxWidth: 315,
    marginTop: 14,
    color: "#FFFFFF",
    fontFamily: "Geist_700Bold",
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.2,
    textAlign: "center",
  },
  company: {
    marginTop: 2,
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Geist_400Regular",
    fontSize: 15,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 14 },
  tag: { paddingHorizontal: 13, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.15)" },
  tagText: { color: "#FFFFFF", fontFamily: "Geist_400Regular", fontSize: 11 },
  heroSummary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 17 },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "70%" },
  summaryText: { color: "rgba(255,255,255,0.9)", fontFamily: "Geist_400Regular", fontSize: 12 },

  tabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 19,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontFamily: "Geist_500Medium", fontSize: 13 },
  tabTextActive: { fontFamily: "Geist_700Bold" },
  content: { paddingHorizontal: 24, paddingTop: 17 },
  matchCard: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 17,
    borderWidth: 1,
  },
  matchHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  matchHeadingCopy: { flex: 1 },
  matchKicker: { fontFamily: "Geist_700Bold", fontSize: 10, letterSpacing: 0.2, textTransform: "uppercase" },
  matchTitle: { maxWidth: 190, marginTop: 3, fontFamily: "Geist_700Bold", fontSize: 13, lineHeight: 16 },
  matchScore: {
    width: 54,
    height: 54,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
    borderWidth: 3,
    backgroundColor: "#FFFFFF",
  },
  matchScoreValue: { fontFamily: "Geist_700Bold", fontSize: 14, lineHeight: 15 },
  matchScoreLabel: { marginTop: 3, fontFamily: "Geist_600SemiBold", fontSize: 8 },
  matchReasons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  matchReason: { flexDirection: "row", alignItems: "flex-start", gap: 6, width: "48%" },
  matchCheck: { width: 16, height: 16, alignItems: "center", justifyContent: "center", marginTop: 1, borderRadius: 8 },
  matchReasonCopy: { flex: 1 },
  matchReasonLabel: { marginBottom: 1, fontFamily: "Geist_700Bold", fontSize: 9 },
  matchReasonValue: { fontFamily: "Geist_400Regular", fontSize: 9, lineHeight: 12 },
  detailSection: {
    marginBottom: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  section: {
    marginBottom: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: { fontFamily: "Geist_600SemiBold", fontSize: 15 },
  description: { fontFamily: "Geist_400Regular", fontSize: 14, lineHeight: 22 },
  requirementsList: { gap: 12 },
  requirementRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  requirementBullet: { width: 6, height: 6, flexShrink: 0, marginTop: 8, borderRadius: 3 },
  requirementText: { flex: 1, fontFamily: "Geist_400Regular", fontSize: 13, lineHeight: 19 },
  metaList: { gap: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontFamily: "Geist_400Regular", fontSize: 13 },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skillChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  skillText: { fontFamily: "Geist_500Medium", fontSize: 12 },
  noSkills: { fontFamily: "Geist_400Regular", fontSize: 13 },
  applyWrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    borderRadius: 16,
  },
  applyBtnText: { fontFamily: "Geist_600SemiBold", fontSize: 15, letterSpacing: -0.15 },
  /* Legacy score helpers retained for the reusable score component. */
  scoreSection: {},
  scoreHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scoreSubtitle: { fontFamily: "Geist_400Regular", fontSize: 12, marginTop: 2 },
  scoreBars: { gap: 10 },
  scoreBarRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreBarLabel: { fontFamily: "Geist_400Regular", fontSize: 12, width: 90 },
  scoreBarRight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  scoreBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  scoreBarFill: { height: 6, borderRadius: 3 },
  scoreBarValue: { fontFamily: "Geist_400Regular", fontSize: 12, width: 35, textAlign: "right" },
  seeMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 6,
  },
  seeMoreText: { fontFamily: "Geist_600SemiBold", fontSize: 13 },
  /*
   * The old contract-row styles are kept so this screen remains safe for
   * cached bundles while Metro refreshes the updated detail layout.
   */
  contractRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  contractPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  contractPillText: { fontFamily: "Geist_700Bold", fontSize: 12, letterSpacing: 0.3 },
  dateChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateText: { fontFamily: "Geist_400Regular", fontSize: 12 },

  /* Premium lock section */
  lockSection: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  lockTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lockIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  lockTitle: { fontFamily: "Geist_700Bold", fontSize: 15 },
  lockDesc: { fontFamily: "Geist_400Regular", fontSize: 13, lineHeight: 19, paddingHorizontal: 2 },
  lockCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 2,
  },
  lockCTAText: { fontFamily: "Geist_700Bold", fontSize: 14, color: "#0A0A0A" },

  /* Modal */
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  dragHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginVertical: 12 },
  modalContent: { alignItems: "center", gap: 14, paddingVertical: 8 },
  modalTitle: { fontFamily: "Geist_700Bold", fontSize: 20, letterSpacing: -0.3 },
  modalDesc: { fontFamily: "Geist_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  priceLabel: { fontFamily: "Geist_400Regular", fontSize: 13 },
  priceAmount: { fontFamily: "Geist_700Bold", fontSize: 22 },
  priceUnit: { fontFamily: "Geist_400Regular", fontSize: 13 },
  modalCTA: { borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, width: "100%" as any, alignItems: "center" },
  modalCTAText: { fontFamily: "Geist_700Bold", fontSize: 15, color: "#0A0A0A" },
  modalSkip: { fontFamily: "Geist_400Regular", fontSize: 13 },
});
