import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetProfile,
  useGetJobStats,
  useUpsertProfile,
  useListSaved,
  useUnsaveJob,
  getGetProfileQueryKey,
  getGetMatchesQueryKey,
  getGetJobStatsQueryKey,
  getListSavedQueryKey,
  useListProfileCvs,
  useReanalyzeProfileCv,
  useDeleteProfileCv,
  getListProfileCvsQueryKey,
  createProfileDeleteToken,
  deleteProfile,
  useUploadProfilePhoto,
  useDeleteProfilePhoto,
  useRegisterProfileNotifications,
} from "@workspace/api-client-react";
import type { CvDocument } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { useColors } from "@/hooks/useColors";
import { JobCard } from "@/components/JobCard";
import { PremiumModal } from "@/components/PremiumGate";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { uploadCvAsset } from "@/lib/cvUpload";
import { clearAuthToken } from "@/lib/authSession";
import { registerForPushNotificationsAsync } from "@/lib/notifications";

type EditField = "name" | "email" | "linkedin" | "phone" | "lastJobTitle" | null;
type ProfileIconName =
  | "user" | "edit-2" | "bookmark" | "x" | "map-pin" | "briefcase"
  | "clock" | "wifi" | "file-text" | "phone" | "mail" | "linkedin" | "link"
  | "camera" | "trash-2" | "bell" | "check";

function ProfileIcon({ name, size = 14, color }: { name: ProfileIconName; size?: number; color: string }) {
  const sw = 1.8;
  const common = { stroke: color, strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "user") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="8" r="4" {...common} /><Path d="M4 21a8 8 0 0 1 16 0" {...common} /></Svg>;
  if (name === "edit-2") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M17 3a2.8 2.8 0 0 1 4 4L8 20l-5 1 1-5L17 3Z" {...common} /><Path d="m15 5 4 4" {...common} /></Svg>;
  if (name === "bookmark") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M6 3h12v18l-6-4-6 4V3Z" {...common} /></Svg>;
  if (name === "x") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="m6 6 12 12M18 6 6 18" {...common} /></Svg>;
  if (name === "map-pin") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" {...common} /><Circle cx="12" cy="10" r="2.5" {...common} /></Svg>;
  if (name === "briefcase") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x="3" y="7" width="18" height="13" rx="2" {...common} /><Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" {...common} /></Svg>;
  if (name === "clock") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="9" {...common} /><Path d="M12 7v5l3 2" {...common} /></Svg>;
  if (name === "wifi") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0M9 16a5 5 0 0 1 6 0M12 20h.01" {...common} /></Svg>;
  if (name === "file-text") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M5 3h10l4 4v14H5V3Z" {...common} /><Path d="M15 3v5h4M8 12h8M8 16h6" {...common} /></Svg>;
  if (name === "phone") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M5 3h4l2 5-2.5 1.5a14 14 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2Z" {...common} /></Svg>;
  if (name === "mail") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x="3" y="5" width="18" height="14" rx="2" {...common} /><Path d="m3 7 9 6 9-6" {...common} /></Svg>;
  if (name === "linkedin") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x="4" y="4" width="16" height="16" rx="2" {...common} /><Path d="M8 10v6M8 7.5v.01M12 16v-3a2 2 0 0 1 4 0v3M12 10v6" {...common} /></Svg>;
  if (name === "camera") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z" {...common} /><Circle cx="12" cy="13" r="3.5" {...common} /></Svg>;
  if (name === "trash-2") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" {...common} /></Svg>;
  if (name === "bell") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" {...common} /></Svg>;
  if (name === "check") return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="m5 12 4 4L19 6" {...common} /></Svg>;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" {...common} /></Svg>;
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: color ?? colors.primary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function CvAnalysisCard({
  cv,
  colors,
  busy,
  onReanalyze,
  onDelete,
}: {
  cv: CvDocument;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  busy: boolean;
  onReanalyze: () => void;
  onDelete: () => void;
}) {
  const analysis = cv.analysis;
  const statusLabel =
    cv.status === "completed"
      ? "Analyse terminée"
      : cv.status === "processing"
        ? "Analyse en cours…"
        : "Analyse échouée";
  const statusColor =
    cv.status === "completed"
      ? "#059669"
      : cv.status === "processing"
        ? colors.primary
        : "#DC2626";

  return (
    <View style={[styles.cvCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cvCardTop}>
        <View style={[styles.cvFileIcon, { backgroundColor: colors.primary + "18" }]}>
          <ProfileIcon name="file-text" size={19} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cvFileName, { color: colors.foreground }]} numberOfLines={1}>
            {cv.fileName}
          </Text>
          <Text style={[styles.cvStatus, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={onDelete}
          disabled={busy}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID={`delete-cv-${cv.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Supprimer le CV ${cv.fileName}`}
        >
          <ProfileIcon name="x" size={17} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {cv.status === "completed" && analysis ? (
        <View style={styles.cvDetails}>
          {!!analysis.headline && (
            <Text style={[styles.cvHeadline, { color: colors.foreground }]}>
              {analysis.headline}
            </Text>
          )}
          {!!analysis.summary && (
            <Text style={[styles.cvSummary, { color: colors.mutedForeground }]} numberOfLines={4}>
              {analysis.summary}
            </Text>
          )}
          {!!analysis.skills?.length && (
            <View style={styles.skillsGrid}>
              {analysis.skills.slice(0, 10).map((skill) => (
                <View
                  key={skill}
                  style={[
                    styles.skillChip,
                    { backgroundColor: colors.primary + "15", borderColor: colors.primary + "35" },
                  ]}
                >
                  <Text style={[styles.skillText, { color: colors.primary }]}>{skill}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.cvFacts}>
            {analysis.yearsExperience != null && (
              <Text style={[styles.cvFact, { color: colors.mutedForeground }]}>
                {analysis.yearsExperience} an{analysis.yearsExperience > 1 ? "s" : ""} d'expérience
              </Text>
            )}
            {!!analysis.languages?.length && (
              <Text style={[styles.cvFact, { color: colors.mutedForeground }]}>
                Langues : {analysis.languages.slice(0, 4).join(", ")}
              </Text>
            )}
            {!!analysis.education?.length && (
              <Text style={[styles.cvFact, { color: colors.mutedForeground }]}>
                Formation : {analysis.education[0].degree || analysis.education[0].school}
              </Text>
            )}
          </View>
          {!!analysis.experiences?.length && (
            <View style={styles.cvExperience}>
              <Text style={[styles.cvSubheading, { color: colors.foreground }]}>
                Expérience récente
              </Text>
              <Text style={[styles.cvFact, { color: colors.mutedForeground }]} numberOfLines={2}>
                {analysis.experiences[0].title}
                {analysis.experiences[0].company ? ` · ${analysis.experiences[0].company}` : ""}
              </Text>
            </View>
          )}
        </View>
      ) : cv.status === "failed" ? (
        <Text style={[styles.cvErrorText, { color: "#DC2626" }]}>
          {cv.errorMessage ?? "Le texte du CV n'a pas pu être analysé."}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[styles.reanalyzeBtn, { borderColor: colors.border }]}
        onPress={onReanalyze}
        disabled={busy || cv.status === "processing"}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[styles.reanalyzeText, { color: colors.primary }]}>
            Réanalyser le CV
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const profileScrollRef = useRef<ScrollView>(null);
  const notificationCardY = useRef(0);
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useGetProfile();
  const { data: stats } = useGetJobStats({
    query: { queryKey: getGetJobStatsQueryKey() },
  });
  const { data: savedJobs } = useListSaved({ query: { queryKey: getListSavedQueryKey() } });
  const upsertProfile = useUpsertProfile();
  const unsaveJob = useUnsaveJob();
  const { data: cvs, isLoading: cvsLoading } = useListProfileCvs({
    query: { queryKey: getListProfileCvsQueryKey() },
  });
  const reanalyzeCv = useReanalyzeProfileCv();
  const deleteCv = useDeleteProfileCv();
  const uploadProfilePhoto = useUploadProfilePhoto();
  const deleteProfilePhoto = useDeleteProfilePhoto();

  const [editField, setEditField] = useState<EditField>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [registeringNotifications, setRegisteringNotifications] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const registerProfileNotifications = useRegisterProfileNotifications();

  const profileNotFound = (error as any)?.status === 404 || error;
  const trialEndsAt = profile?.premiumTrialUntil ? Date.parse(profile.premiumTrialUntil) : NaN;
  const trialDaysRemaining =
    profile?.isPremiumTrial && Number.isFinite(trialEndsAt)
      ? Math.max(1, Math.ceil((trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000)))
      : null;
  const topPadding = Platform.OS === "web" ? 67 : insets.top + 16;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 100;

  useEffect(() => {
    if (focus !== "notifications" || !profile || profileNotFound) return;

    const timeout = setTimeout(() => {
      profileScrollRef.current?.scrollTo({
        y: Math.max(0, notificationCardY.current - 24),
        animated: true,
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [focus, profile, profileNotFound]);

  const handleUnsave = useCallback(
    (jobId: number) => {
      unsaveJob.mutate(
        { jobId },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSavedQueryKey() }) }
      );
    },
    [unsaveJob, queryClient]
  );

  async function addCv() {
    if (uploadingCv) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingCv(true);
    try {
      await uploadCvAsset(result.assets[0]);
      await queryClient.invalidateQueries({ queryKey: getListProfileCvsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
    } catch (error) {
      Alert.alert(
        "Analyse impossible",
        error instanceof Error ? error.message : "Le CV n'a pas pu être analysé.",
      );
    } finally {
      setUploadingCv(false);
    }
  }

  async function handlePickProfilePhoto() {
    if (uploadProfilePhoto.isPending || !profile) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.72,
      base64: true,
      exif: false,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) {
      if (!result.canceled) {
        Alert.alert("Photo indisponible", "Cette image n'a pas pu être préparée. Choisis une autre photo.");
      }
      return;
    }

    const mimeType = asset.mimeType === "image/png" ? "png" : asset.mimeType === "image/webp" ? "webp" : "jpeg";
    const profilePhoto = `data:image/${mimeType};base64,${asset.base64}`;
    if (profilePhoto.length > 1_600_000) {
      Alert.alert("Photo trop lourde", "Choisis une photo plus légère (1 Mo maximum après compression).");
      return;
    }

    try {
      const updated = await uploadProfilePhoto.mutateAsync({ data: { profilePhoto } });
      queryClient.setQueryData(getGetProfileQueryKey(), updated);
    } catch (error) {
      Alert.alert(
        "Ajout impossible",
        error instanceof Error ? error.message : "La photo n'a pas pu être enregistrée.",
      );
    }
  }

  function handleDeleteProfilePhoto() {
    if (deleteProfilePhoto.isPending || !profile?.profilePhoto) return;
    Alert.alert(
      "Supprimer la photo ?",
      "La photo sera retirée de ton profil. Tu pourras en ajouter une nouvelle à tout moment.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const updated = await deleteProfilePhoto.mutateAsync();
              queryClient.setQueryData(getGetProfileQueryKey(), updated);
            } catch (error) {
              Alert.alert(
                "Suppression impossible",
                error instanceof Error ? error.message : "La photo n'a pas pu être supprimée.",
              );
            }
          },
        },
      ],
    );
  }

  function handleReanalyze(cvId: number) {
    reanalyzeCv.mutate(
      { id: cvId },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getListProfileCvsQueryKey() });
          await queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          await queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        },
        onError: (error) => {
          Alert.alert("Réanalyse impossible", error instanceof Error ? error.message : "Réessaie plus tard.");
        },
      },
    );
  }

  function handleDeleteCv(cvId: number) {
    Alert.alert("Supprimer ce CV ?", "Les données extraites de ce document seront supprimées.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCv.mutateAsync({ id: cvId });
            queryClient.setQueryData<CvDocument[]>(
              getListProfileCvsQueryKey(),
              (current) => current?.filter((cv) => cv.id !== cvId) ?? [],
            );
            await queryClient.invalidateQueries({ queryKey: getListProfileCvsQueryKey() });
            await queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
            await queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
          } catch (error) {
            Alert.alert(
              "Suppression impossible",
              error instanceof Error ? error.message : "Réessaie plus tard.",
            );
          }
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Supprimer mon compte",
      "Cette action est irréversible. Ton profil, tes CV et tes offres sauvegardées seront définitivement supprimés.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer mon compte",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirmer la suppression",
              "Es-tu sûr(e) de vouloir supprimer définitivement ton compte ?",
              [
                { text: "Annuler", style: "cancel" },
                {
                  text: "Oui, supprimer",
                  style: "destructive",
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      // Step 1: request a short-lived, single-use confirmation token.
                      // The current verified email session is attached automatically
                      // by the shared API client.
                      const { token } = await createProfileDeleteToken();
                      // Keep the authenticated session in Authorization and send
                      // the one-time confirmation token separately.
                      await deleteProfile({ headers: { "X-Delete-Token": token } });
                      await clearAuthToken();
                      queryClient.clear();
                      router.replace("/auth" as any);
                    } catch (error) {
                      Alert.alert(
                        "Erreur",
                        error instanceof Error
                          ? error.message
                          : "La suppression a échoué. Réessaie plus tard.",
                      );
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  async function handleEnableNotifications() {
    if (Platform.OS === "web" || registeringNotifications) return;

    setRegisteringNotifications(true);
    try {
      const registration = await registerForPushNotificationsAsync();
      if (!registration) {
        Alert.alert(
          "Autorisation nécessaire",
          "Autorise les notifications dans les réglages de l’appareil, puis réessaie.",
        );
        return;
      }

      await registerProfileNotifications.mutateAsync({
        data: {
          enabled: true,
          token: registration.token,
          platform: registration.platform,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      Alert.alert(
        "Notifications activées",
        "Tu recevras maintenant les nouvelles offres qui correspondent à ton profil.",
      );
    } catch (error) {
      Alert.alert(
        "Activation impossible",
        error instanceof Error
          ? error.message
          : "Les notifications n’ont pas pu être activées. Réessaie plus tard.",
      );
    } finally {
      setRegisteringNotifications(false);
    }
  }

  function openEdit(field: EditField) {
    if (!profile || !field) return;
    setEditField(field);
    const map: Record<NonNullable<EditField>, string> = {
      name: profile.name,
      email: profile.email ?? "",
      linkedin: profile.linkedin ?? "",
      phone: profile.phone ?? "",
      lastJobTitle: profile.lastJobTitle ?? "",
    };
    setEditValue(map[field]);
  }

  function closeEdit() {
    setEditField(null);
    setEditValue("");
  }

  async function saveEdit() {
    if (!profile || !editField) return;
    const nextName = editField === "name" ? editValue.trim() : profile.name;
    if (!nextName) return;
    setSaving(true);
    upsertProfile.mutate(
      {
        data: {
          name: nextName,
          title: profile.title ?? "",
          location: profile.location,
          skills: profile.skills,
          experienceYears: profile.experienceYears,
          remote: profile.remote ?? false,
          jobTypes: profile.jobTypes,
          salaryMin: profile.salaryMin ?? 0,
          salaryMax: profile.salaryMax ?? 0,
          email: editField === "email" ? editValue.trim() : (profile.email ?? ""),
          linkedin: editField === "linkedin" ? editValue.trim() : (profile.linkedin ?? ""),
          phone: editField === "phone" ? editValue.trim() : (profile.phone ?? ""),
          lastJobTitle: editField === "lastJobTitle" ? editValue.trim() : (profile.lastJobTitle ?? ""),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
          setSaving(false);
          closeEdit();
        },
        onError: () => setSaving(false),
      }
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (profileNotFound || !profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPadding }]}>
        <ProfileIcon name="user" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Profil non configuré</Text>
        <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
          Créez votre profil pour recevoir des offres personnalisées
        </Text>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/onboarding" as any)}
        >
          <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>
            Créer mon profil
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const experienceLabel = (() => {
    const y = profile.experienceYears;
    if (y === 0) return "Moins d'1 an";
    if (y <= 3) return "1 à 3 ans";
    if (y <= 5) return "3 à 5 ans";
    if (y <= 10) return "5 à 10 ans";
    return "10 ans et plus";
  })();

  const savedList = savedJobs ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.headerBar,
          { paddingTop: topPadding, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profil</Text>
        <TouchableOpacity
          style={[styles.editBtn, { borderColor: colors.border }]}
          onPress={() => router.push("/onboarding" as any)}
        >
          <ProfileIcon name="edit-2" size={14} color={colors.foreground} />
          <Text style={[styles.editBtnText, { color: colors.foreground }]}>Modifier</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={profileScrollRef}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.avatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}
            onPress={handlePickProfilePhoto}
            disabled={uploadProfilePhoto.isPending}
            accessibilityRole="button"
            accessibilityLabel={profile.profilePhoto ? "Modifier la photo de profil" : "Ajouter une photo de profil"}
          >
            {profile.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            )}
            <View style={[styles.avatarCamera, { backgroundColor: colors.primary }]}>
              {uploadProfilePhoto.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <ProfileIcon name="camera" size={13} color={colors.primaryForeground} />
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.photoActions}>
            <TouchableOpacity onPress={handlePickProfilePhoto} disabled={uploadProfilePhoto.isPending}>
              <Text style={[styles.photoActionText, { color: colors.primary }]}>
                {profile.profilePhoto ? "Modifier la photo" : "Ajouter une photo"}
              </Text>
            </TouchableOpacity>
            {profile.profilePhoto && (
              <TouchableOpacity onPress={handleDeleteProfilePhoto} disabled={deleteProfilePhoto.isPending}>
                <View style={styles.photoDeleteAction}>
                  <ProfileIcon name="trash-2" size={13} color="#DC2626" />
                  <Text style={styles.photoDeleteText}>Supprimer</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>{profile.name}</Text>
            <TouchableOpacity
              onPress={() => openEdit("name")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Modifier le nom complet"
            >
              <ProfileIcon name="edit-2" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          {profile.title && (
            <Text style={[styles.jobTitle, { color: colors.mutedForeground }]}>{profile.title}</Text>
          )}
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Statut du profil : ${
              profile.isPremiumTrial
                ? `essai Premium, ${trialDaysRemaining ?? 1} jour${
                    (trialDaysRemaining ?? 1) > 1 ? "s" : ""
                  } restant${(trialDaysRemaining ?? 1) > 1 ? "s" : ""}`
                : profile.isPremium
                  ? "Premium"
                  : "Free"
            }`}
            style={[
              styles.profileStatus,
              {
                backgroundColor: profile.isPremium ? "#FFF7D6" : colors.secondary,
                borderColor: profile.isPremium ? "#EAB308" : colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.profileStatusMark,
                { backgroundColor: profile.isPremium ? "#EAB308" : colors.mutedForeground },
              ]}
            >
              <Text style={styles.profileStatusMarkText}>{profile.isPremium ? "★" : "•"}</Text>
            </View>
            <View style={styles.profileStatusCopy}>
              <Text style={[styles.profileStatusLabel, { color: colors.mutedForeground }]}>
                STATUT DU PROFIL
              </Text>
              <Text
                style={[
                  styles.profileStatusValue,
                  { color: profile.isPremium ? "#A16207" : colors.foreground },
                ]}
              >
                {profile.isPremiumTrial ? "ESSAI PREMIUM" : profile.isPremium ? "PREMIUM" : "FREE"}
              </Text>
              {profile.isPremiumTrial && (
                <Text style={[styles.profileStatusDetails, { color: colors.mutedForeground }]}>
                  7 jours offerts · sans prélèvement automatique
                </Text>
              )}
            </View>
            {profile.isPremiumTrial && trialDaysRemaining !== null ? (
              <Text style={[styles.profileStatusExpiry, { color: colors.primary }]}>
                {trialDaysRemaining} j restant{trialDaysRemaining > 1 ? "s" : ""}
              </Text>
            ) : profile.isPremium && profile.premiumUntil ? (
              <Text style={[styles.profileStatusExpiry, { color: "#A16207" }]}>
                Actif
              </Text>
            ) : null}
          </View>
          {profile.isPremiumTrialExpired && (
            <View
              style={[
                styles.trialExpiredCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.trialExpiredCopy}>
                <Text style={[styles.trialExpiredTitle, { color: colors.foreground }]}>
                  Ton essai Premium est terminé
                </Text>
                <Text style={[styles.trialExpiredBody, { color: colors.mutedForeground }]}>
                  Tu es revenu au mode gratuit. Passe à Premium pour retrouver tous les avantages.
                </Text>
              </View>
              <TouchableOpacity
                testID="trial-expired-premium-cta"
                onPress={() => setPremiumModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Découvrir l’offre Premium"
                style={[styles.trialUpgradeAction, { borderColor: colors.primary }]}
              >
                <Text style={[styles.trialUpgradeText, { color: colors.primary }]}>
                  Voir Premium
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Informations */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Informations</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow icon="map-pin" label="Ville" value={profile.location || "Non renseigné"} colors={colors} />
          {profile.lastJobTitle && (
            <InfoRow icon="briefcase" label="Dernier poste" value={profile.lastJobTitle} colors={colors} />
          )}
          {!profile.lastJobTitle && (
            <ContactRow
              icon="briefcase"
              label="Dernier poste"
              value={profile.lastJobTitle ?? null}
              placeholder="Ajouter ton dernier poste"
              onEdit={() => openEdit("lastJobTitle")}
              colors={colors}
            />
          )}
          <InfoRow icon="clock" label="Expérience" value={experienceLabel} colors={colors} />
          <InfoRow icon="wifi" label="Télétravail" value={profile.remote ? "Oui" : "Non"} colors={colors} />
          <InfoRow
            icon="file-text"
            label="Contrats"
            value={profile.jobTypes.join(", ") || "Non renseigné"}
            colors={colors}
            isLast
          />
        </View>

        {/* Contact & Réseaux */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Contact & Réseaux</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ContactRow
            icon="phone"
            label="Téléphone"
            value={profile.phone ?? null}
            placeholder="Ajouter ton numéro"
            onEdit={() => openEdit("phone")}
            onOpen={profile.phone ? () => Linking.openURL(`tel:${profile.phone}`) : undefined}
            colors={colors}
          />
          <ContactRow
            icon="mail"
            label="Email"
            value={profile.email ?? null}
            placeholder="Ajouter ton email"
            onEdit={() => openEdit("email")}
            onOpen={profile.email ? () => Linking.openURL(`mailto:${profile.email}`) : undefined}
            colors={colors}
          />
          <ContactRow
            icon="linkedin"
            label="LinkedIn"
            value={profile.linkedin ?? null}
            placeholder="Ajouter ton profil LinkedIn"
            onEdit={() => openEdit("linkedin")}
            onOpen={
              profile.linkedin
                ? () => {
                    const url = profile.linkedin!.startsWith("http")
                      ? profile.linkedin!
                      : `https://${profile.linkedin}`;
                    Linking.openURL(url);
                  }
                : undefined
            }
            colors={colors}
            isLast
          />
        </View>

        {/* CV analysés */}
        <View style={styles.cvSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
            Mes CV
          </Text>
          <TouchableOpacity
            style={[styles.addCvBtn, { backgroundColor: colors.primary }]}
            onPress={addCv}
            disabled={uploadingCv}
          >
            {uploadingCv ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.addCvText, { color: colors.primaryForeground }]}>+ Ajouter</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={[styles.cvSectionHint, { color: colors.mutedForeground }]}>
          Les informations extraites servent à améliorer tes correspondances.
        </Text>
        {cvsLoading ? (
          <View style={[styles.cvLoading, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : cvs?.length ? (
          <View style={styles.cvList}>
            {cvs.map((cv) => (
              <CvAnalysisCard
                key={cv.id}
                cv={cv}
                colors={colors}
                busy={reanalyzeCv.isPending || deleteCv.isPending}
                onReanalyze={() => handleReanalyze(cv.id)}
                onDelete={() => handleDeleteCv(cv.id)}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.cvEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ProfileIcon name="file-text" size={24} color={colors.mutedForeground} />
            <Text style={[styles.savedEmptyText, { color: colors.mutedForeground }]}>
              Aucun CV ajouté
            </Text>
          </View>
        )}

        {/* Offres sauvegardées */}
        <View style={styles.savedHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
            Offres sauvegardées
          </Text>
          {savedList.length > 0 && (
            <View style={styles.savedHeaderRight}>
              <View style={[styles.countBadge, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.countText, { color: colors.primary }]}>{savedList.length}</Text>
              </View>
              {savedList.length > 2 && (
                <TouchableOpacity onPress={() => router.push("/(tabs)/saved" as any)}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>Voir tout</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {savedList.length === 0 ? (
          <View style={[styles.savedEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ProfileIcon name="bookmark" size={24} color={colors.mutedForeground} />
            <Text style={[styles.savedEmptyText, { color: colors.mutedForeground }]}>
              Aucune offre sauvegardée
            </Text>
          </View>
        ) : (
          <View style={styles.savedList}>
            {savedList.slice(0, 2).map((item) =>
              item.job ? (
                <JobCard
                  key={item.id}
                  job={item.job}
                  isSaved
                  onUnsave={handleUnsave}
                  showScore={false}
                />
              ) : null
            )}
          </View>
        )}

        {/* Compétences */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Compétences</Text>
        <View style={[styles.skillsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.skillsGrid}>
            {profile.skills.map((skill) => (
              <View
                key={skill}
                style={[
                  styles.skillChip,
                  { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" },
                ]}
              >
                <Text style={[styles.skillText, { color: colors.primary }]}>{skill}</Text>
              </View>
            ))}
            {profile.skills.length === 0 && (
              <Text style={[styles.emptySkills, { color: colors.mutedForeground }]}>
                Aucune compétence ajoutée
              </Text>
            )}
          </View>
        </View>

        {/* Marché de l'emploi */}
        {stats && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Marché de l'emploi</Text>
            <View style={styles.statsRow}>
              <StatCard label="Offres disponibles" value={String(stats.totalJobs)} />
              <StatCard label="Sources" value={String(stats.totalSources)} color={colors.accent} />
            </View>
            {stats.topSkills.length > 0 && (
              <View
                style={[styles.topSkillsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.topSkillsTitle, { color: colors.mutedForeground }]}>
                  Compétences les plus demandées
                </Text>
                <View style={styles.skillsGrid}>
                  {stats.topSkills.slice(0, 8).map((s) => (
                    <View
                      key={s.skill}
                      style={[styles.skillChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                    >
                      <Text style={[styles.skillText, { color: colors.secondaryForeground }]}>
                        {s.skill} · {s.count}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notifications</Text>
        <View
          onLayout={(event) => {
            notificationCardY.current = event.nativeEvent.layout.y;
          }}
          style={[styles.notificationCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.notificationTitle, { color: colors.foreground }]}>
            Reste informé des nouvelles offres
          </Text>
          <Text style={[styles.notificationHint, { color: colors.mutedForeground }]}>
            Active les notifications pour être alerté quand une nouvelle offre correspond à ton profil.
          </Text>
          {profile?.notificationsEnabled ? (
            <View
              style={[
                styles.notificationStatus,
                { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" },
              ]}
            >
              <ProfileIcon name="check" size={17} color={colors.primary} />
              <Text style={[styles.notificationStatusText, { color: colors.primary }]}>
                Notifications activées
              </Text>
            </View>
          ) : Platform.OS === "web" ? (
            <Text style={[styles.notificationHint, { color: colors.mutedForeground }]}>
              L’activation est disponible depuis l’application mobile.
            </Text>
          ) : (
            <TouchableOpacity
              style={[
                styles.notificationEnableBtn,
                { backgroundColor: colors.primary, opacity: registeringNotifications ? 0.65 : 1 },
              ]}
              onPress={handleEnableNotifications}
              disabled={registeringNotifications}
              accessibilityRole="button"
              accessibilityLabel="Activer les notifications"
            >
              {registeringNotifications ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <ProfileIcon name="bell" size={16} color={colors.primaryForeground} />
                  <Text style={[styles.notificationEnableText, { color: colors.primaryForeground }]}>
                    Activer les notifications
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Danger zone */}
        <TouchableOpacity
          style={[styles.deleteAccountBtn, { borderColor: "#DC2626" + "40" }]}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
          accessibilityRole="button"
          accessibilityLabel="Supprimer mon compte"
        >
          {deletingAccount ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <Text style={styles.deleteAccountText}>Supprimer mon compte</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <PremiumModal
        visible={premiumModalVisible}
        lockedCount={0}
        onClose={() => setPremiumModalVisible(false)}
      />

      {/* Edit modal */}
      <Modal visible={editField !== null} transparent animationType="fade" onRequestClose={closeEdit}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeEdit} activeOpacity={1} />
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editField === "email" ? "Adresse email"
                  : editField === "name" ? "Nom complet"
                  : editField === "linkedin" ? "Profil LinkedIn"
                  : editField === "phone" ? "Numéro de téléphone"
                  : "Dernier poste occupé"}
              </Text>
              <TouchableOpacity onPress={closeEdit}>
                <ProfileIcon name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View
              style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <ProfileIcon
                name={
                    editField === "name" ? "user"
                    : editField === "email" ? "mail"
                  : editField === "phone" ? "phone"
                  : editField === "lastJobTitle" ? "briefcase"
                  : "link"
                }
                size={16}
                color={colors.mutedForeground}
              />
              <TextInput
                style={[styles.modalTextInput, { color: colors.foreground }]}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={
                  editField === "name" ? "Ex. Kouassi Amani"
                  : editField === "email" ? "ton@email.com"
                  : editField === "phone" ? "+225 07 00 00 00 00"
                  : editField === "lastJobTitle" ? "ex: Comptable, Chargé de clientèle…"
                  : "linkedin.com/in/ton-profil"
                }
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize={editField === "name" || editField === "lastJobTitle" ? "words" : "none"}
                keyboardType={
                  editField === "email" ? "email-address"
                  : editField === "phone" ? "phone-pad"
                  : "default"
                }
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={closeEdit}
              >
                <Text style={[styles.modalCancelText, { color: colors.foreground }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={saveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.modalSaveText, { color: colors.primaryForeground }]}>
                    Enregistrer
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
  isLast,
}: {
  icon: ProfileIconName;
  label: string;
  value: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  isLast?: boolean;
}) {
  return (
    <View
      style={[styles.infoRow, { borderBottomColor: colors.border }, isLast && styles.infoRowLast]}
    >
      <View style={styles.infoLeft}>
        <ProfileIcon name={icon} size={14} color={colors.mutedForeground} />
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function ContactRow({
  icon,
  label,
  value,
  placeholder,
  onEdit,
  onOpen,
  colors,
  isLast,
}: {
  icon: ProfileIconName;
  label: string;
  value: string | null;
  placeholder: string;
  onEdit: () => void;
  onOpen?: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  isLast?: boolean;
}) {
  return (
    <View
      style={[styles.contactRow, { borderBottomColor: colors.border }, isLast && styles.infoRowLast]}
    >
      <View style={styles.infoLeft}>
        <ProfileIcon name={icon} size={14} color={colors.mutedForeground} />
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <View style={styles.contactRight}>
        {value ? (
          <TouchableOpacity onPress={onOpen} activeOpacity={onOpen ? 0.7 : 1}>
            <Text
              style={[styles.contactValue, { color: onOpen ? colors.primary : colors.foreground }]}
              numberOfLines={1}
            >
              {value}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.contactPlaceholder, { color: colors.mutedForeground }]}>
            {placeholder}
          </Text>
        )}
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ProfileIcon name="edit-2" size={13} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
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
  headerBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: "Geist_700Bold", fontSize: 24, letterSpacing: -0.5 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtnText: { fontFamily: "Geist_500Medium", fontSize: 13 },

  profileCard: {
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 4,
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 34 },
  avatarCamera: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarText: { fontFamily: "Geist_700Bold", fontSize: 30 },
  photoActions: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: -2, marginBottom: 2 },
  photoActionText: { fontFamily: "Geist_600SemiBold", fontSize: 13 },
  photoDeleteAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  photoDeleteText: { color: "#DC2626", fontFamily: "Geist_500Medium", fontSize: 13 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontFamily: "Geist_700Bold", fontSize: 20 },
  jobTitle: { fontFamily: "Geist_500Medium", fontSize: 14 },
  profileStatus: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  profileStatusMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  profileStatusMarkText: {
    color: "#FFFFFF",
    fontFamily: "Geist_700Bold",
    fontSize: 15,
    lineHeight: 18,
  },
  profileStatusCopy: { flex: 1, gap: 1 },
  profileStatusLabel: {
    fontFamily: "Geist_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  profileStatusValue: {
    fontFamily: "Geist_700Bold",
    fontSize: 16,
    letterSpacing: 0.6,
  },
  profileStatusExpiry: {
    fontFamily: "Geist_600SemiBold",
    fontSize: 11,
  },
  profileStatusDetails: { fontFamily: "Geist_400Regular", fontSize: 11, lineHeight: 15 },
  trialExpiredCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
  },
  trialExpiredCopy: { flex: 1, gap: 4 },
  trialExpiredTitle: { fontFamily: "Geist_700Bold", fontSize: 13 },
  trialExpiredBody: { fontFamily: "Geist_400Regular", fontSize: 12, lineHeight: 17 },
  trialUpgradeAction: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  trialUpgradeText: { fontFamily: "Geist_600SemiBold", fontSize: 12 },

  sectionTitle: {
    fontFamily: "Geist_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },
  infoCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontFamily: "Geist_400Regular", fontSize: 13 },
  infoValue: { fontFamily: "Geist_500Medium", fontSize: 13 },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 12,
  },
  contactRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  contactValue: {
    fontFamily: "Geist_500Medium",
    fontSize: 13,
    maxWidth: 180,
    textDecorationLine: "underline",
  },
  contactPlaceholder: { fontFamily: "Geist_400Regular", fontSize: 13, fontStyle: "italic" },

  savedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },
  savedHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
  },
  countText: { fontFamily: "Geist_600SemiBold", fontSize: 13 },
  seeAll: { fontFamily: "Geist_500Medium", fontSize: 13 },
  savedEmpty: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  savedEmptyText: { fontFamily: "Geist_400Regular", fontSize: 13 },
  savedList: { marginBottom: 20 },

  skillsCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 20 },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skillChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  skillText: { fontFamily: "Geist_500Medium", fontSize: 12 },
  emptySkills: { fontFamily: "Geist_400Regular", fontSize: 13 },
  cvSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 6,
  },
  cvSectionHint: { fontFamily: "Geist_400Regular", fontSize: 12, lineHeight: 17, marginBottom: 10 },
  addCvBtn: { borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7 },
  addCvText: { fontFamily: "Geist_600SemiBold", fontSize: 12 },
  cvLoading: { borderRadius: 14, borderWidth: 1, padding: 22, alignItems: "center", marginBottom: 20 },
  cvEmpty: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  cvList: { gap: 10, marginBottom: 20 },
  cvCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cvCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  cvFileIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  cvFileName: { fontFamily: "Geist_600SemiBold", fontSize: 13 },
  cvStatus: { fontFamily: "Geist_500Medium", fontSize: 11, marginTop: 3 },
  cvDetails: { gap: 9, marginTop: 13 },
  cvHeadline: { fontFamily: "Geist_600SemiBold", fontSize: 14 },
  cvSummary: { fontFamily: "Geist_400Regular", fontSize: 12, lineHeight: 18 },
  cvFacts: { gap: 4 },
  cvFact: { fontFamily: "Geist_400Regular", fontSize: 12, lineHeight: 17 },
  cvExperience: { gap: 3, paddingTop: 2 },
  cvSubheading: { fontFamily: "Geist_600SemiBold", fontSize: 12 },
  cvErrorText: { fontFamily: "Geist_400Regular", fontSize: 12, lineHeight: 17, marginTop: 12 },
  reanalyzeBtn: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1,
    marginTop: 13,
    paddingVertical: 9,
  },
  reanalyzeText: { fontFamily: "Geist_600SemiBold", fontSize: 12 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1, gap: 4 },
  statValue: { fontFamily: "Geist_700Bold", fontSize: 24 },
  statLabel: { fontFamily: "Geist_400Regular", fontSize: 11, textAlign: "center" },
  topSkillsCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 20, gap: 12 },
  topSkillsTitle: { fontFamily: "Geist_500Medium", fontSize: 12, letterSpacing: 0.3 },
  notificationCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 20, gap: 9 },
  notificationTitle: { fontFamily: "Geist_600SemiBold", fontSize: 14 },
  notificationHint: { fontFamily: "Geist_400Regular", fontSize: 12, lineHeight: 17 },
  notificationStatus: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 3 },
  notificationStatusText: { fontFamily: "Geist_600SemiBold", fontSize: 13 },
  notificationEnableBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, paddingVertical: 12, marginTop: 3 },
  notificationEnableText: { fontFamily: "Geist_600SemiBold", fontSize: 13 },

  emptyTitle: { fontFamily: "Geist_600SemiBold", fontSize: 18, textAlign: "center" },
  emptyDesc: { fontFamily: "Geist_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  createBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  createBtnText: { fontFamily: "Geist_600SemiBold", fontSize: 15 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalBox: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontFamily: "Geist_600SemiBold", fontSize: 16 },
  modalInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modalTextInput: { flex: 1, fontFamily: "Geist_400Regular", fontSize: 14 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalCancelText: { fontFamily: "Geist_500Medium", fontSize: 14 },
  modalSaveBtn: { flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: 12 },
  modalSaveText: { fontFamily: "Geist_600SemiBold", fontSize: 14 },

  deleteAccountBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  deleteAccountText: {
    fontFamily: "Geist_500Medium",
    fontSize: 14,
    color: "#DC2626",
  },
  deleteAccountSupportText: {
    fontFamily: "Geist_400Regular",
    fontSize: 12,
    color: "#DC2626",
    opacity: 0.6,
    marginTop: 2,
    textAlign: "center",
  },
});
