import React from "react";
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { formatRelativeJobDate, getJobCalendarDayDifference, type JobDateFields } from "@/lib/jobDates";

export type TimelinePeriodLabel = "Aujourd'hui" | "Hier" | "Cette semaine";

export interface TimelineJob {
  id: number;
  title: string;
  company: string;
  logoUrl?: string | null;
  location: string;
  remote?: boolean;
  skills?: string[];
  jobType: string;
  postedAt?: string | null;
  scrapedAt?: string;
}

export function getTimelinePeriod(job: JobDateFields): TimelinePeriodLabel {
  const diffDays = getJobCalendarDayDifference(job);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  return "Cette semaine";
}

export function getTimelineDate(job: JobDateFields): string {
  return formatRelativeJobDate(job) ?? "Date indisponible";
}

function CompanyMark({ job, large = false }: { job: TimelineJob; large?: boolean }) {
  const colors = useColors();
  const [hasError, setHasError] = React.useState(false);

  return (
    <View
      style={[
        large ? styles.leadCompanyMark : styles.rowCompanyMark,
        { backgroundColor: colors.primary + "18", borderColor: colors.primary + "45" },
      ]}
    >
      {job.logoUrl && !hasError ? (
        <Image
          source={{ uri: job.logoUrl }}
          style={large ? styles.leadCompanyLogo : styles.rowCompanyLogo}
          resizeMode="cover"
          onError={() => setHasError(true)}
          accessibilityLabel={`Logo de ${job.company}`}
        />
      ) : (
        <Text style={[large ? styles.leadCompanyInitial : styles.rowCompanyInitial, { color: colors.primary }]}>
          {job.company.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

function SaveButton({
  saved,
  onPress,
  title,
}: {
  saved: boolean;
  onPress: () => void;
  title: string;
}) {
  const colors = useColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={saved ? `Retirer ${title} des sauvegardés` : `Sauvegarder ${title}`}
      style={styles.saveButton}
    >
      <Feather name="bookmark" size={18} color={saved ? colors.primary : colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export function CuratedLeadCard({
  job,
  fitScore,
  isSaved,
  isOpened,
  onSave,
  onOpen,
}: {
  job: TimelineJob;
  fitScore: number;
  isSaved: boolean;
  isOpened: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  const colors = useColors();
  const leadSkill = job.skills?.[0] ?? "vos compétences";
  const secondSkill = job.skills?.[1] ?? "votre expérience";

  function handleOpen() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpen();
  }

  return (
    <View style={[styles.leadCard, { backgroundColor: colors.card, borderColor: colors.primary + "80" }]}>
      <View style={styles.leadTopRow}>
        <CompanyMark job={job} large />
        <Text style={[styles.leadCompany, { color: colors.secondaryForeground }]} numberOfLines={1}>
          {job.company}
        </Text>
        <SaveButton saved={isSaved} onPress={onSave} title={job.title} />
      </View>

      <View style={styles.leadScoreRow}>
        <Text style={[styles.leadScore, { color: colors.primary }]}>{Math.round(fitScore)}</Text>
        <View style={styles.leadScoreLabel}>
          <Text style={[styles.leadScorePercent, { color: colors.primary + "B8" }]}>%</Text>
          <Text style={[styles.leadScoreMatch, { color: colors.primary + "B8" }]}>MATCH</Text>
        </View>
      </View>

      <Text style={[styles.leadTitle, { color: colors.foreground }]} numberOfLines={2}>
        {job.title}
      </Text>

      <View style={styles.leadMetaRow}>
        <View style={styles.metaItem}>
          <Feather name="map-pin" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{job.location}</Text>
        </View>
        {job.remote && (
          <View style={styles.metaItem}>
            <Feather name="wifi" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Remote</Text>
          </View>
        )}
        <View style={[styles.contractPill, { backgroundColor: colors.primary }]}>
          <Text style={[styles.contractText, { color: colors.primaryForeground }]}>{job.jobType}</Text>
        </View>
      </View>

      <View style={[styles.reasonBox, { backgroundColor: colors.primary + "0F", borderLeftColor: colors.primary }]}>
        <View style={styles.reasonLabel}>
          <Feather name="check" size={14} color={colors.primary} />
          <Text style={[styles.reasonLabelText, { color: colors.primary }]}>Pourquoi ce match</Text>
        </View>
        <Text style={[styles.reasonText, { color: colors.secondaryForeground }]}>
          Votre profil et vos compétences en <Text style={{ fontFamily: "Geist_600SemiBold", color: colors.foreground }}>{leadSkill}</Text>
          {" "}et <Text style={{ fontFamily: "Geist_600SemiBold", color: colors.foreground }}>{secondSkill}</Text> correspondent directement à ce poste.
        </Text>
      </View>

      <View style={styles.leadBottomRow}>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={13} color={colors.mutedForeground} />
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{getTimelineDate(job)}</Text>
        </View>
        <TouchableOpacity
          onPress={handleOpen}
          accessibilityRole="button"
          accessibilityLabel={`Ouvrir ${job.title}`}
          style={[styles.cta, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Voir l'offre</Text>
          <Feather name="arrow-up-right" size={16} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {isOpened && (
        <Text style={[styles.openNote, { color: colors.primary }]}>Ouverture de l'offre en préparation</Text>
      )}
    </View>
  );
}

export function TimelineJobRow({
  job,
  fitScore,
  isSaved,
  onSave,
  onOpen,
}: {
  job: TimelineJob;
  fitScore: number;
  isSaved: boolean;
  onSave: () => void;
  onOpen: () => void;
}) {
  const colors = useColors();

  function handleOpen() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpen();
  }

  return (
    <View style={[styles.row, { borderTopColor: colors.border }]}>
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Voir l'offre ${job.title}`}
        style={styles.rowTapArea}
      >
        <CompanyMark job={job} />
        <View style={styles.rowCopy}>
          <Text style={[styles.rowCompany, { color: colors.mutedForeground }]} numberOfLines={1}>
            {job.company} <Text style={{ color: colors.primary }}>· {Math.round(fitScore)}%</Text>
          </Text>
          <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={2}>
            {job.title}
          </Text>
          <View style={styles.rowMetaLine}>
            <Text style={[styles.rowMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
              {job.location}{job.remote ? " · Remote" : ""} · {job.jobType}
            </Text>
            <Text style={[styles.rowDate, { color: colors.mutedForeground }]} numberOfLines={1}>
              {getTimelineDate(job)}
            </Text>
          </View>
          {!!job.skills?.length && (
            <View style={styles.rowSkillRow}>
              {job.skills.slice(0, 2).map((skill) => (
                <View key={skill} style={[styles.rowSkillChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.rowSkillText, { color: colors.secondaryForeground }]} numberOfLines={1}>
                    {skill}
                  </Text>
                </View>
              ))}
              {job.skills.length > 2 && (
                <Text style={[styles.rowMoreSkills, { color: colors.mutedForeground }]}>+{job.skills.length - 2}</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
      <SaveButton saved={isSaved} onPress={onSave} title={job.title} />
      <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
    </View>
  );
}

export function TimelinePeriod({
  label,
  count,
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
        <Text style={[styles.periodCount, { color: colors.mutedForeground }]}>
          {count} {count === 1 ? "offre" : "offres"}
        </Text>
      </View>
      {children}
    </View>
  );
}

export function CurrentPeriodLabel() {
  const colors = useColors();

  return (
    <View style={styles.currentPeriod}>
      <View style={[styles.currentDot, { backgroundColor: colors.background, borderColor: colors.primary }]} />
      <Text style={[styles.currentLabel, { color: colors.foreground }]}>Aujourd'hui</Text>
      <Text style={[styles.currentHint, { color: colors.mutedForeground }]}>Votre meilleur match</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  leadCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 17,
    overflow: "hidden",
    gap: 12,
  },
  leadTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  leadCompanyMark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  leadCompanyLogo: { width: "100%", height: "100%", borderRadius: 10 },
  leadCompanyInitial: { fontFamily: "Geist_700Bold", fontSize: 17 },
  leadCompany: { flex: 1, fontFamily: "Geist_600SemiBold", fontSize: 12 },
  saveButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  leadScoreRow: { flexDirection: "row", alignItems: "flex-end", gap: 5, marginTop: 6 },
  leadScore: { fontFamily: "Geist_700Bold", fontSize: 43, lineHeight: 47, letterSpacing: -3 },
  leadScoreLabel: { alignItems: "flex-start", justifyContent: "flex-end", paddingBottom: 3 },
  leadScorePercent: { fontFamily: "Geist_500Medium", fontSize: 10, lineHeight: 11, letterSpacing: 0.5 },
  leadScoreMatch: { fontFamily: "Geist_700Bold", fontSize: 8, lineHeight: 9, letterSpacing: 0.5 },
  leadTitle: { fontFamily: "Geist_600SemiBold", fontSize: 21, lineHeight: 24, letterSpacing: -0.5 },
  leadMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 9 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: "Geist_400Regular", fontSize: 11 },
  contractPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  contractText: { fontFamily: "Geist_700Bold", fontSize: 11 },
  reasonBox: { padding: 11, borderLeftWidth: 2, gap: 6, marginTop: 3 },
  reasonLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  reasonLabelText: { fontFamily: "Geist_700Bold", fontSize: 11 },
  reasonText: { fontFamily: "Geist_400Regular", fontSize: 12, lineHeight: 17 },
  leadBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateText: { fontFamily: "Geist_400Regular", fontSize: 11 },
  cta: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 },
  ctaText: { fontFamily: "Geist_700Bold", fontSize: 12 },
  openNote: { fontFamily: "Geist_400Regular", fontSize: 11 },
  currentPeriod: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 6, paddingBottom: 9 },
  currentDot: { width: 9, height: 9, borderWidth: 2, borderRadius: 5 },
  currentLabel: { fontFamily: "Geist_700Bold", fontSize: 12 },
  currentHint: { fontFamily: "Geist_400Regular", fontSize: 10 },
  period: { position: "relative", paddingLeft: 20, paddingBottom: 10 },
  periodRail: { position: "absolute", left: 4, top: 10, bottom: 10, width: 1 },
  periodHeading: { flexDirection: "row", alignItems: "baseline", gap: 8, paddingBottom: 4, minHeight: 18 },
  periodDot: { position: "absolute", left: -20, top: 3, width: 9, height: 9, borderWidth: 2, borderRadius: 5 },
  periodLabel: { fontFamily: "Geist_700Bold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  periodCount: { marginLeft: "auto", fontFamily: "Geist_400Regular", fontSize: 10 },
  row: { minHeight: 98, flexDirection: "row", alignItems: "center", paddingHorizontal: 3, paddingVertical: 14, borderTopWidth: 1 },
  rowTapArea: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  rowCompanyMark: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  rowCompanyLogo: { width: "100%", height: "100%", borderRadius: 8 },
  rowCompanyInitial: { fontFamily: "Geist_700Bold", fontSize: 14 },
  rowCopy: { flex: 1, minWidth: 0, gap: 4 },
  rowCompany: { fontFamily: "Geist_600SemiBold", fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase" },
  rowTitle: { fontFamily: "Geist_600SemiBold", fontSize: 14, lineHeight: 18 },
  rowMetaLine: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  rowMeta: { flex: 1, fontFamily: "Geist_400Regular", fontSize: 10 },
  rowDate: { flexShrink: 0, fontFamily: "Geist_400Regular", fontSize: 9 },
  rowSkillRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, paddingTop: 2 },
  rowSkillChip: { maxWidth: 110, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderRadius: 6 },
  rowSkillText: { fontFamily: "Geist_400Regular", fontSize: 9 },
  rowMoreSkills: { fontFamily: "Geist_400Regular", fontSize: 9 },
});