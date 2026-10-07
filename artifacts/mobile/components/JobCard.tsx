import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Animated } from "react-native";
import { useRef, useEffect, useState } from "react";

import { useColors } from "@/hooks/useColors";
import { formatRelativeJobDate } from "@/lib/jobDates";

interface Job {
  id: number;
  title: string;
  company: string;
  logoUrl?: string | null;
  location: string;
  remote?: boolean;
  skills: string[];
  jobType: string;
  source: string;
  postedAt?: string | null;
  scrapedAt?: string;
}

interface JobCardProps {
  job: Job;
  fitScore?: number;
  isSaved?: boolean;
  onSave?: (jobId: number) => void;
  onUnsave?: (jobId: number) => void;
  showScore?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#10B981";
  if (score >= 50) return "#F59E0B";
  return "#DC4444";
}

function AnimatedScoreRing({ score, size = 46 }: { score: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animValue = useRef(new Animated.Value(0)).current;
  const color = getScoreColor(score);
  const cx = size / 2;
  const cy = size / 2;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: score,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cy} r={radius} stroke="#262626" strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={cx} cy={cy} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color, fontFamily: "GeistMono_700Bold", fontSize: 13, lineHeight: 16 }}>
            {score}
          </Text>
        </View>
      </View>
    </View>
  );
}

function CompanyLogo({ company, logoUrl }: { company: string; logoUrl?: string | null }) {
  const colors = useColors();
  const [hasError, setHasError] = useState(false);

  if (logoUrl && !hasError) {
    return (
      <View style={[styles.companyBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Image
          source={{ uri: logoUrl }}
          style={styles.companyLogoImage}
          resizeMode="cover"
          onError={() => setHasError(true)}
          accessibilityLabel={`Logo de ${company}`}
        />
      </View>
    );
  }

  return (
    <View style={[styles.companyBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
      <Text style={[styles.companyInitial, { color: colors.primary }]}>
        {company.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export function JobCard({ job, fitScore, isSaved, onSave, onUnsave, showScore = true }: JobCardProps) {
  const colors = useColors();
  const router = useRouter();
  const scoreColor = fitScore !== undefined ? getScoreColor(fitScore) : colors.border;
  const relativeDate = formatRelativeJobDate(job);
  const topSkills = job.skills.slice(0, 3);
  const extraSkills = job.skills.length - 3;

  function handlePress() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/job/${job.id}` as any);
  }

  function handleSave() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSaved) onUnsave?.(job.id);
    else onSave?.(job.id);
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      {/* Left accent bar */}
      {showScore && fitScore !== undefined && (
        <View style={[styles.accentBar, { backgroundColor: scoreColor }]} />
      )}

      {/* Header: logo | company+title | score ring */}
      <View style={styles.header}>
        <CompanyLogo company={job.company} logoUrl={job.logoUrl} />
        <View style={styles.headerText}>
          <Text style={[styles.company, { color: colors.mutedForeground }]} numberOfLines={1}>
            {job.company}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {job.title}
          </Text>
        </View>
        {showScore && fitScore !== undefined && (
          <AnimatedScoreRing score={fitScore} size={46} />
        )}
      </View>

      {/* Meta: location · remote | contract type pill */}
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.mutedForeground} strokeWidth={2}>
            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <Circle cx={12} cy={10} r={3} />
          </Svg>
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{job.location}</Text>
          {job.remote && (
            <>
              <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Remote</Text>
            </>
          )}
        </View>
        <View style={[styles.contractPill, { backgroundColor: colors.primary }]}>
          <Text style={styles.contractPillText}>{job.jobType}</Text>
        </View>
      </View>

      {/* Skills + bookmark */}
      <View style={styles.footer}>
        <View style={styles.skills}>
          {topSkills.map((skill) => (
            <View key={skill} style={[styles.skillChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.skillText, { color: colors.secondaryForeground }]} numberOfLines={1}>
                {skill}
              </Text>
            </View>
          ))}
          {extraSkills > 0 && (
            <Text style={[styles.moreSkills, { color: colors.mutedForeground }]}>+{extraSkills}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path
              d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
              fill={isSaved ? colors.primary : "none"}
              stroke={isSaved ? colors.primary : colors.mutedForeground}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Publication date */}
      {relativeDate && (
        <View style={styles.dateRow}>
          <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={colors.mutedForeground} strokeWidth={2}>
            <Path d="M3 4h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2z" />
            <Path d="M16 2v4M8 2v4M2 10h20" />
          </Svg>
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{relativeDate}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    position: "relative",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 16,
    bottom: 16,
    width: 3,
    borderRadius: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingLeft: 8,
  },
  companyBadge: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
    overflow: "hidden",
  },
  companyInitial: {
    fontFamily: "Geist_700Bold",
    fontSize: 19,
  },
  companyLogoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  headerText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  company: {
    fontFamily: "Geist_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "Geist_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 8,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
    flexWrap: "wrap",
  },
  metaText: {
    fontFamily: "Geist_400Regular",
    fontSize: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.5,
  },
  contractPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 0,
    marginLeft: 8,
  },
  contractPillText: {
    fontFamily: "Geist_700Bold",
    fontSize: 11,
    color: "#0A0A0A",
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 8,
  },
  skills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    flex: 1,
    alignItems: "center",
  },
  skillChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
    maxWidth: 120,
  },
  skillText: {
    fontFamily: "Geist_400Regular",
    fontSize: 11,
  },
  moreSkills: {
    fontFamily: "Geist_400Regular",
    fontSize: 11,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingLeft: 8,
  },
  dateText: {
    fontFamily: "Geist_400Regular",
    fontSize: 11,
  },
});
