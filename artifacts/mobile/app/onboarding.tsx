import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  ActivityIndicator,
  Linking,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpsertProfile,
  useGetProfile,
  getGetProfileQueryKey,
  getListProfileCvsQueryKey,
  getGetMatchesQueryKey,
  registerProfileNotifications,
  useCreateProfessionChangePayment,
  useGetProfessionChangePaymentStatus,
  getGetProfessionChangePaymentStatusQueryKey,
} from "@workspace/api-client-react";
import type { CandidateProfile, CvAnalysis, CvDocument } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import type { DocumentPickerAsset } from "expo-document-picker";

import { useColors } from "@/hooks/useColors";
import { uploadCvAsset } from "@/lib/cvUpload";
import {
  registerForPushNotificationsAsync,
  type FirebasePushRegistration,
} from "@/lib/notifications";

const TOTAL_STEPS = 8;

const DIPLOMA_LEVELS = [
  { id: "sans", label: "Sans diplôme", sublabel: "Expérience terrain valorisée", icon: "user" as const, color: "#9CA3AF" },
  { id: "bepc", label: "BEPC / Brevet", sublabel: "Collège — classe de 3ème", icon: "book" as const, color: "#10B981" },
  { id: "bac", label: "BAC", sublabel: "Lycée — Terminale", icon: "book-open" as const, color: "#3B82F6" },
  { id: "bts", label: "BTS / DUT", sublabel: "Bac+2 — Formation technique", icon: "layers" as const, color: "#8B5CF6" },
  { id: "licence", label: "Licence / Bachelor", sublabel: "Bac+3 — Université", icon: "award" as const, color: "#F59E0B" },
  { id: "master", label: "Master / DESS", sublabel: "Bac+5 — Grande École ou Université", icon: "star" as const, color: "#F97316" },
  { id: "doctorat", label: "Doctorat / PhD", sublabel: "Bac+8 — Recherche et enseignement", icon: "zap" as const, color: "#EC4899" },
];

const EXPERIENCE_LEVELS = [
  {
    id: 0,
    label: "Moins d'1 an",
    sublabel: "Débutant — stage, alternance ou premier emploi",
    icon: "star" as const,
    color: "#10B981",
    years: 0,
  },
  {
    id: 1,
    label: "1 à 3 ans",
    sublabel: "Junior — premières expériences professionnelles",
    icon: "trending-up" as const,
    color: "#3B82F6",
    years: 2,
  },
  {
    id: 2,
    label: "3 à 5 ans",
    sublabel: "Confirmé — autonome et opérationnel",
    icon: "award" as const,
    color: "#8B5CF6",
    years: 4,
  },
  {
    id: 3,
    label: "5 à 10 ans",
    sublabel: "Expérimenté — expertise reconnue",
    icon: "shield" as const,
    color: "#F59E0B",
    years: 7,
  },
  {
    id: 4,
    label: "10 ans et plus",
    sublabel: "Senior — leadership et vision stratégique",
    icon: "zap" as const,
    color: "#F97316",
    years: 12,
  },
];

const CATEGORIES = [
  {
    id: "commercial",
    label: "Commercial & Vente",
    icon: "trending-up" as const,
    color: "#3B82F6",
    bg: "#3B82F615",
    professions: [
      "Commercial terrain",
      "Téléconseiller",
      "Chargé de clientèle",
      "Agent immobilier",
      "Responsable des ventes",
      "Chef de secteur",
      "Attaché commercial",
      "Business Developer",
    ],
  },
  {
    id: "marketing",
    label: "Communication & Marketing",
    icon: "volume-2" as const,
    color: "#8B5CF6",
    bg: "#8B5CF615",
    professions: [
      "Community Manager",
      "Chargé de communication",
      "Responsable marketing digital",
      "Graphiste",
      "Chargé de relations publiques",
      "Rédacteur web / Copywriter",
      "Traffic Manager",
      "Chargé de communication digitale",
    ],
  },
  {
    id: "admin",
    label: "Administration & Assistanat",
    icon: "briefcase" as const,
    color: "#10B981",
    bg: "#10B98115",
    professions: [
      "Assistant commercial",
      "Secrétaire",
      "Agent de saisie",
      "Office Manager",
      "Assistante RH",
      "Assistant de direction",
      "Chargé d'administration",
      "Archiviste",
    ],
  },
  {
    id: "finance",
    label: "Finance & Comptabilité",
    icon: "dollar-sign" as const,
    color: "#F59E0B",
    bg: "#F59E0B15",
    professions: [
      "Assistant comptable",
      "Contrôleur de gestion junior",
      "Auditeur junior",
      "Caissier",
      "Comptable général",
      "Analyste financier",
      "Gestionnaire de paie",
      "Responsable comptable",
    ],
  },
  {
    id: "logistique",
    label: "Logistique & Service",
    icon: "truck" as const,
    color: "#F97316",
    bg: "#F9731615",
    professions: [
      "Agent logistique",
      "Livreur",
      "Magasinier",
      "Agent de sécurité",
      "Hôte / Hôtesse d'accueil",
      "Responsable logistique",
      "Gestionnaire de stock",
      "Chauffeur professionnel",
    ],
  },
  {
    id: "digital",
    label: "Digital & Tech",
    icon: "monitor" as const,
    color: "#6366F1",
    bg: "#6366F115",
    professions: [
      "Développeur web junior",
      "Data analyst junior",
      "Technicien informatique",
      "Webmaster",
      "Développeur mobile",
      "Administrateur système",
      "UX/UI Designer",
      "Chef de projet digital",
    ],
  },
  {
    id: "technique",
    label: "Métiers Techniques",
    icon: "tool" as const,
    color: "#9CA3AF",
    bg: "#9CA3AF15",
    professions: [
      "Électricien",
      "Plombier",
      "Technicien de maintenance",
      "Mécanicien auto",
      "Technicien froid & climatisation",
      "Charpentier",
      "Maçon",
      "Technicien télécoms",
    ],
  },
  {
    id: "rh",
    label: "Ressources Humaines",
    icon: "users" as const,
    color: "#14B8A6",
    bg: "#14B8A615",
    professions: [
      "Chargé de recrutement",
      "Responsable RH",
      "Assistant RH",
      "Formateur",
      "Chargé de développement RH",
      "Gestionnaire de paie",
      "Conseiller en emploi",
    ],
  },
];

const VILLES = [
  { name: "Abidjan", sublabel: "Capitale économique" },
  { name: "Bouaké", sublabel: "2ème ville du pays" },
  { name: "Yamoussoukro", sublabel: "Capitale politique" },
  { name: "Daloa", sublabel: "Centre-Ouest" },
  { name: "San-Pédro", sublabel: "Port du Sud-Ouest" },
  { name: "Korhogo", sublabel: "Nord" },
  { name: "Man", sublabel: "Ouest montagneux" },
  { name: "Gagnoa", sublabel: "Centre-Ouest" },
];

const SKILL_CATEGORIES = [
  {
    id: "bureautique",
    label: "Bureautique & Outils",
    icon: "monitor" as const,
    color: "#3B82F6",
    skills: [
      "Excel",
      "Word",
      "PowerPoint",
      "Google Sheets",
      "Google Docs",
      "Canva",
      "Notion",
      "Trello",
      "Slack",
      "Microsoft Teams",
      "Outlook",
      "Tableau",
    ],
  },
  {
    id: "commercial",
    label: "Commercial & Vente",
    icon: "trending-up" as const,
    color: "#10B981",
    skills: [
      "Service client",
      "Vente",
      "Négociation",
      "Prospection",
      "CRM",
      "Démarchage commercial",
      "Gestion de compte",
      "Fidélisation client",
      "Closing",
      "Relation B2B",
    ],
  },
  {
    id: "communication",
    label: "Communication & Marketing",
    icon: "volume-2" as const,
    color: "#8B5CF6",
    skills: [
      "Communication",
      "Réseaux sociaux",
      "Rédaction web",
      "Email marketing",
      "SEO / Référencement",
      "Community management",
      "Relations publiques",
      "Marketing digital",
      "Publicité en ligne",
      "Storytelling",
      "Prise de parole",
      "Création de contenu",
    ],
  },
  {
    id: "management",
    label: "Management & Organisation",
    icon: "users" as const,
    color: "#F59E0B",
    skills: [
      "Gestion de projet",
      "Leadership",
      "Organisation",
      "Gestion du temps",
      "Planification",
      "Travail en équipe",
      "Coordination d'équipe",
      "Reporting",
      "Prise de décision",
      "Gestion des priorités",
      "Agile / Scrum",
    ],
  },
  {
    id: "finance",
    label: "Finance & Comptabilité",
    icon: "dollar-sign" as const,
    color: "#F97316",
    skills: [
      "Comptabilité",
      "Facturation",
      "Contrôle de gestion",
      "Audit",
      "Gestion de budget",
      "Saisie comptable",
      "Fiscalité",
      "Analyse financière",
      "Gestion de la paie",
      "Rapports financiers",
    ],
  },
  {
    id: "informatique",
    label: "Informatique & Digital",
    icon: "code" as const,
    color: "#6366F1",
    skills: [
      "Informatique",
      "Développement web",
      "HTML / CSS",
      "JavaScript",
      "Python",
      "Bases de données",
      "Réseaux informatiques",
      "Analyse de données",
      "Excel avancé",
      "Cybersécurité",
      "Administration système",
      "Support technique",
    ],
  },
  {
    id: "langues",
    label: "Langues",
    icon: "globe" as const,
    color: "#EC4899",
    skills: [
      "Anglais professionnel",
      "Anglais courant",
      "Français écrit",
      "Espagnol",
      "Dioula",
      "Baoulé",
      "Arabe",
      "Communication bilingue",
      "Traduction",
    ],
  },
  {
    id: "rh",
    label: "Ressources Humaines",
    icon: "heart" as const,
    color: "#14B8A6",
    skills: [
      "Ressources humaines",
      "Recrutement",
      "Formation",
      "Droit social",
      "Gestion administrative du personnel",
      "Onboarding",
      "Évaluation des performances",
      "Relations sociales",
      "GPEC",
    ],
  },
  {
    id: "logistique",
    label: "Logistique & Opérations",
    icon: "truck" as const,
    color: "#84CC16",
    skills: [
      "Logistique",
      "Gestion des stocks",
      "Approvisionnement",
      "Transport",
      "Supply chain",
      "Gestion d'entrepôt",
      "Planification logistique",
      "Import / Export",
      "Douanes",
    ],
  },
  {
    id: "design",
    label: "Design & Créativité",
    icon: "pen-tool" as const,
    color: "#F43F5E",
    skills: [
      "Design graphique",
      "Photoshop",
      "Illustrator",
      "Figma",
      "UX / UI Design",
      "Montage vidéo",
      "Photographie",
      "Motion design",
      "Indesign",
      "Canva Pro",
    ],
  },
];

function haptic() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Map(values.map((value) => value.trim()).filter(Boolean).map((value) => [value.toLowerCase(), value])).values()];
}

function isPlaceholderName(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLocaleLowerCase("fr-FR") ?? "";
  return !normalized || normalized === "nouveau candidat" || normalized === "utilisateur" || normalized === "new candidate";
}

function experienceLevelForYears(years: number): number {
  return EXPERIENCE_LEVELS.reduce((best, level) =>
    Math.abs(level.years - years) < Math.abs(best.years - years) ? level : best
  ).id;
}

function diplomaIdForDegree(degree: string): string | null {
  const value = degree.toLowerCase();
  if (value.includes("doctor") || value.includes("phd")) return "doctorat";
  if (value.includes("master") || value.includes("dess") || value.includes("mba")) return "master";
  if (value.includes("licence") || value.includes("bachelor")) return "licence";
  if (value.includes("bts") || value.includes("dut") || value.includes("deug")) return "bts";
  if (value.includes("bac")) return "bac";
  if (value.includes("bepc") || value.includes("brevet")) return "bepc";
  return null;
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: existingProfile } = useGetProfile();
  const upsertProfile = useUpsertProfile();
  const createProfessionChangePayment = useCreateProfessionChangePayment();

  const [step, setStep] = useState(0);
  const [draftProfile, setDraftProfile] = useState<CandidateProfile | null>(null);

  const [name, setName] = useState(
    existingProfile?.name && !isPlaceholderName(existingProfile.name) ? existingProfile.name : "",
  );
  const [profession, setProfession] = useState(existingProfile?.title ?? "");
  const [metierSearch, setMetierSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [ville, setVille] = useState(existingProfile?.location ?? "");

  const [skills, setSkills] = useState<string[]>(
    existingProfile?.skills ?? []
  );

  const [experienceLevelId, setExperienceLevelId] = useState<number | null>(
    existingProfile?.experienceYears != null
      ? (EXPERIENCE_LEVELS.reduce((best, lvl) =>
          Math.abs(lvl.years - (existingProfile.experienceYears ?? 0)) <
          Math.abs(best.years - (existingProfile.experienceYears ?? 0))
            ? lvl
            : best
        ).id)
      : null
  );

  const [diploma, setDiploma] = useState<string | null>(existingProfile?.diploma ?? null);
  const [bio, setBio] = useState(existingProfile?.bio ?? "");
  const [email, setEmail] = useState(existingProfile?.email ?? "");
  const [phone, setPhone] = useState(existingProfile?.phone ?? "");
  const [lastJobTitle, setLastJobTitle] = useState(existingProfile?.lastJobTitle ?? "");

  const [cvAsset, setCvAsset] = useState<DocumentPickerAsset | null>(null);
  const [cvDocument, setCvDocument] = useState<CvDocument | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [isConfirmingCv, setIsConfirmingCv] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pushRegistration, setPushRegistration] = useState<FirebasePushRegistration | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [professionPaymentId, setProfessionPaymentId] = useState<number | null>(null);
  const [professionPaymentUrl, setProfessionPaymentUrl] = useState<string | null>(null);
  const [professionPaymentEnvironment, setProfessionPaymentEnvironment] = useState<"sandbox" | "live" | null>(null);
  const [professionSandboxTestPhone, setProfessionSandboxTestPhone] = useState<string | null>(null);
  const [professionPaymentError, setProfessionPaymentError] = useState<string | null>(null);
  const [showProfessionPaymentPrompt, setShowProfessionPaymentPrompt] = useState(false);
  const [isCompletingProfessionChange, setIsCompletingProfessionChange] = useState(false);

  const professionPaymentStatus = useGetProfessionChangePaymentStatus(professionPaymentId ?? 0, {
    query: {
      queryKey: getGetProfessionChangePaymentStatusQueryKey(professionPaymentId ?? 0),
      enabled: professionPaymentId !== null,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "completed" || status === "failed" ? false : 3000;
      },
    },
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const filteredProfessions = useMemo(() => {
    const q = metierSearch.toLowerCase().trim();
    if (!q) return null;
    return CATEGORIES.flatMap((c) =>
      c.professions
        .filter((p) => p.toLowerCase().includes(q))
        .map((p) => ({ profession: p, category: c }))
    );
  }, [metierSearch]);

  const activeCv = cvDocument ?? existingProfile?.latestCv ?? null;
  const cvAnalysis = activeCv?.analysis ?? null;
  const profileBase = existingProfile ?? draftProfile;

  React.useEffect(() => {
    if (isPlaceholderName(name) && existingProfile?.name && !isPlaceholderName(existingProfile.name)) {
      setName(existingProfile.name);
    }
  }, [existingProfile?.name, name]);

  React.useEffect(() => {
    const cvName = existingProfile?.latestCv?.analysis?.fullName;
    if (isPlaceholderName(name) && cvName && !isPlaceholderName(cvName)) {
      setName(cvName);
    }
  }, [existingProfile?.latestCv?.analysis?.fullName, name]);

  function applyCvAnalysis(analysis: CvAnalysis) {
    const detectedSkills = uniqueStrings([...analysis.skills, ...analysis.softSkills]);
    if (isPlaceholderName(name) && analysis.fullName) {
      setName(analysis.fullName);
    }
    if (!profession.trim()) {
      setProfession(analysis.headline?.trim() || analysis.desiredRoles[0]?.trim() || "");
    }
    if (!ville.trim() && analysis.location?.trim()) {
      setVille(analysis.location.trim());
    }
    if (detectedSkills.length > 0) {
      setSkills(uniqueStrings([...skills, ...detectedSkills]));
    }
    if (experienceLevelId === null && analysis.yearsExperience != null) {
      setExperienceLevelId(experienceLevelForYears(analysis.yearsExperience));
    }
    if (!diploma && analysis.education[0]?.degree) {
      setDiploma(diplomaIdForDegree(analysis.education[0].degree));
    }
    if (!bio.trim() && analysis.summary?.trim()) {
      setBio(analysis.summary.trim());
    }
    if (!lastJobTitle.trim() && analysis.experiences[0]?.title?.trim()) {
      setLastJobTitle(analysis.experiences[0].title.trim());
    }
    if (!email.trim() && analysis.email?.trim()) {
      setEmail(analysis.email.trim());
    }
    if (!phone.trim() && analysis.phone?.trim()) {
      setPhone(analysis.phone.trim());
    }
  }

  const customMetierExact = useMemo(() => {
    const q = metierSearch.trim();
    if (!q) return false;
    return CATEGORIES.every((c) =>
      c.professions.every((p) => p.toLowerCase() !== q.toLowerCase())
    );
  }, [metierSearch]);

  function goBack() {
    haptic();
    if (activeCategory && step === 3) {
      setActiveCategory(null);
      return;
    }
    if (step === 0) {
      router.back();
    } else if (step === 3) {
      setStep(cvAnalysis ? 2 : 1);
    } else {
      setStep((s) => s - 1);
    }
  }

  function goNext() {
    haptic();
    if (step === 1) {
      setStep(cvAnalysis ? 2 : 3);
      return;
    }
    setStep((s) => s + 1);
  }

  function canGoNext(): boolean {
    if (step === 0) return true;
    if (step === 1) return !isUploadingCv && !isPlaceholderName(name);
    if (step === 2) return true;
    if (step === 3) return profession.length > 0;
    if (step === 4) return ville.length > 0;
    if (step === 5) return skills.length > 0;
    if (step === 6) return true;
    if (step === 7) return experienceLevelId !== null;
    return true;
  }

  async function handlePickCV() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setCvAsset(asset);
      setCvError(null);
      haptic();
      setIsUploadingCv(true);
      try {
        if (!existingProfile && !draftProfile) {
          const created = await upsertProfile.mutateAsync({
            data: {
              name: !isPlaceholderName(name) ? name.trim() : "Utilisateur",
              title: undefined,
              skills: [],
              experienceYears: 0,
              location: "",
              remote: false,
              jobTypes: ["CDI", "CDD"],
              salaryMin: 0,
              salaryMax: 0,
            },
          });
          setDraftProfile(created);
          queryClient.setQueryData(getGetProfileQueryKey(), created);
        }

        const uploaded = await uploadCvAsset(asset, { enrichProfile: false });
        setCvDocument(uploaded);
        if (uploaded.analysis) {
          applyCvAnalysis(uploaded.analysis);
        }
      } catch (error) {
        setCvError(error instanceof Error ? error.message : "Le CV n'a pas pu être analysé");
      } finally {
        setIsUploadingCv(false);
      }
    }
  }

  async function handleNotificationsChange(enabled: boolean) {
    haptic();
    setNotificationError(null);

    if (!enabled) {
      setPushRegistration(null);
      setNotificationsEnabled(false);
      return;
    }

    try {
      const registration = await registerForPushNotificationsAsync();
      if (!registration) {
        setNotificationsEnabled(false);
        setNotificationError(
          "Autorise les notifications dans les réglages de ton appareil pour recevoir les offres.",
        );
        return;
      }
      setPushRegistration(registration);
      setNotificationsEnabled(true);
    } catch (error) {
      setNotificationsEnabled(false);
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Notifications indisponibles pour le moment.",
      );
    }
  }

  const resolvedName = !isPlaceholderName(name)
    ? name.trim()
    : !isPlaceholderName(profileBase?.name)
      ? profileBase!.name.trim()
      : "";

  const profilePayload = {
    name: resolvedName || "Utilisateur",
    title: profession || undefined,
    location: ville,
    skills,
    experienceYears: experienceLevelId !== null
      ? (EXPERIENCE_LEVELS.find((l) => l.id === experienceLevelId)?.years ?? 0)
      : (existingProfile?.experienceYears ?? 0),
    remote: profileBase?.remote ?? false,
    jobTypes: profileBase?.jobTypes ?? ["CDI", "CDD"],
    salaryMin: profileBase?.salaryMin ?? 0,
    salaryMax: profileBase?.salaryMax ?? 0,
    diploma: diploma ?? undefined,
    bio: bio || undefined,
    email: email || undefined,
    phone: phone || undefined,
    lastJobTitle: lastJobTitle || undefined,
  };

  async function finishAfterProfileSaved(options: { uploadCv: boolean }) {
    try {
      await registerProfileNotifications({
        enabled: notificationsEnabled,
        token: notificationsEnabled ? pushRegistration?.token ?? null : null,
        platform: Platform.OS === "ios" ? "ios" : "android",
      });
    } catch (error) {
      setNotificationError(
        error instanceof Error
          ? error.message
          : "Les notifications n'ont pas pu être enregistrées.",
      );
    }

    if (options.uploadCv && cvAsset && !cvDocument) {
      setIsUploadingCv(true);
      try {
        await uploadCvAsset(cvAsset);
      } catch (error) {
        setCvError(error instanceof Error ? error.message : "Le CV n'a pas pu être analysé");
        return;
      } finally {
        setIsUploadingCv(false);
      }
    }
    await queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
    await queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
    router.replace("/(tabs)" as any);
  }

  async function saveProfile() {
    await saveProfileAndFinish({ uploadCv: false });
  }

  async function saveProfileAndFinish(options: { uploadCv: boolean }) {
    if (!resolvedName) {
      throw new Error("Indique ton nom complet avant de terminer ton inscription.");
    }
    await upsertProfile.mutateAsync({ data: profilePayload });
    await finishAfterProfileSaved(options);
  }

  async function skipCvAndFinish() {
    if (upsertProfile.isPending || isUploadingCv || isCompletingProfessionChange) return;
    setCvError(null);
    try {
      await saveProfileAndFinish({ uploadCv: false });
    } catch (error) {
      const apiError = error as { status?: number; data?: { code?: string; professionChangeAvailableAt?: string } };
      if (apiError.status === 409 || apiError.data?.code === "PROFESSION_CHANGE_PAYMENT_REQUIRED") {
        setProfessionPaymentError(null);
        setShowProfessionPaymentPrompt(true);
        return;
      }
      setCvError(error instanceof Error ? error.message : "Le profil n'a pas pu être enregistré.");
    }
  }

  async function handleFinish() {
    if (upsertProfile.isPending || isUploadingCv || isCompletingProfessionChange) return;
    setCvError(null);
    try {
      await saveProfile();
    } catch (error) {
      const apiError = error as { status?: number; data?: { code?: string; professionChangeAvailableAt?: string } };
      if (apiError.status === 409 || apiError.data?.code === "PROFESSION_CHANGE_PAYMENT_REQUIRED") {
        setProfessionPaymentError(null);
        setShowProfessionPaymentPrompt(true);
        return;
      }
      setCvError(error instanceof Error ? error.message : "Le profil n'a pas pu être enregistré.");
    }
  }

  async function handleCvConfirmation() {
    if (
      isConfirmingCv ||
      upsertProfile.isPending ||
      isUploadingCv ||
      isCompletingProfessionChange ||
      !cvAnalysis
    ) {
      return;
    }

    setCvError(null);
    if (!resolvedName) {
      setCvError("Indique ton nom complet avant de confirmer les informations du CV.");
      return;
    }
    if (!profession.trim()) {
      setCvError("Confirme au moins le métier détecté avant de continuer.");
      return;
    }

    setIsConfirmingCv(true);
    try {
      await upsertProfile.mutateAsync({ data: profilePayload });
      await queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getListProfileCvsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
      router.replace({
        pathname: "/(tabs)/profile",
        params: { focus: "notifications" },
      } as any);
    } catch (error) {
      const apiError = error as { status?: number; data?: { code?: string } };
      if (apiError.status === 409 || apiError.data?.code === "PROFESSION_CHANGE_PAYMENT_REQUIRED") {
        setProfessionPaymentError(null);
        setShowProfessionPaymentPrompt(true);
        return;
      }
      setCvError(
        error instanceof Error
          ? error.message
          : "Les informations du CV n'ont pas pu être confirmées.",
      );
    } finally {
      setIsConfirmingCv(false);
    }
  }

  async function startProfessionChangePayment() {
    setProfessionPaymentError(null);
    try {
      const payment = await createProfessionChangePayment.mutateAsync({ data: { title: profession } });
      setProfessionPaymentId(payment.id);
      setProfessionPaymentUrl(payment.checkoutUrl);
      setProfessionPaymentEnvironment(payment.environment);
      setProfessionSandboxTestPhone(payment.sandboxTestPhone ?? null);
      const openRequest = Platform.OS === "web"
        ? Linking.openURL(payment.checkoutUrl)
        : WebBrowser.openBrowserAsync(payment.checkoutUrl);
      await openRequest;
    } catch (error) {
      setProfessionPaymentError(
        error instanceof Error ? error.message : "Le paiement n'a pas pu être créé.",
      );
    }
  }

  React.useEffect(() => {
    if (professionPaymentStatus.data?.status !== "completed" || isCompletingProfessionChange) return;
    setIsCompletingProfessionChange(true);
    void saveProfile()
      .catch((error) => {
        setProfessionPaymentError(
          error instanceof Error ? error.message : "Le métier n'a pas pu être enregistré après le paiement.",
        );
      })
      .finally(() => setIsCompletingProfessionChange(false));
  }, [professionPaymentStatus.data?.status]);

  const progress = step / TOTAL_STEPS;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {step > 0 && (
        <View
          style={[
            styles.navbar,
            {
              paddingTop: topPadding + 8,
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` as any, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <Text style={[styles.stepCounter, { color: colors.mutedForeground }]}>
            {step}/{TOTAL_STEPS}
          </Text>
        </View>
      )}

      {step === 0 && <WelcomeStep colors={colors} insets={insets} onStart={goNext} />}

      {step === 1 && (
        <CvImportStep
          colors={colors}
          name={name}
          setName={setName}
          cvName={activeCv?.fileName ?? cvAsset?.name ?? null}
          cvError={cvError}
          isUploading={isUploadingCv}
          hasAnalysis={Boolean(cvAnalysis)}
          onPickCV={handlePickCV}
          onContinue={goNext}
          onSkip={() => {
            haptic();
            setStep(3);
          }}
          bottomPadding={bottomPadding}
        />
      )}

      {step === 2 && cvAnalysis && (
        <CvReviewStep
          colors={colors}
          analysis={cvAnalysis}
          profession={profession}
          setProfession={setProfession}
          ville={ville}
          setVille={setVille}
          skills={skills}
          setSkills={setSkills}
          lastJobTitle={lastJobTitle}
          setLastJobTitle={setLastJobTitle}
          bio={bio}
          setBio={setBio}
          email={email}
          setEmail={setEmail}
          phone={phone}
          setPhone={setPhone}
          cvError={cvError}
          onNext={handleCvConfirmation}
          isConfirming={isConfirmingCv}
          bottomPadding={bottomPadding}
        />
      )}

      {step === 3 && (
        <MetierStep
          colors={colors}
          profession={profession}
          setProfession={setProfession}
          search={metierSearch}
          setSearch={setMetierSearch}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          filteredProfessions={filteredProfessions}
          customMetierExact={customMetierExact}
          onNext={goNext}
          canNext={canGoNext()}
          bottomPadding={bottomPadding}
        />
      )}

      {step === 4 && (
        <VilleStep
          colors={colors}
          ville={ville}
          setVille={setVille}
          onNext={goNext}
          bottomPadding={bottomPadding}
        />
      )}

      {step === 5 && (
        <SkillsStep
          colors={colors}
          skills={skills}
          setSkills={setSkills}
          onNext={goNext}
          canNext={canGoNext()}
          bottomPadding={bottomPadding}
        />
      )}

      {step === 6 && (
        <DiplomaStep
          colors={colors}
          diploma={diploma}
          setDiploma={setDiploma}
          onNext={goNext}
          bottomPadding={bottomPadding}
        />
      )}

      {step === 7 && (
        <ExperienceStep
          colors={colors}
          experienceLevelId={experienceLevelId}
          setExperienceLevelId={setExperienceLevelId}
          onNext={goNext}
          canNext={canGoNext()}
          bottomPadding={bottomPadding}
        />
      )}

      {step === 8 && (
        <FinishStep
          colors={colors}
          cvName={activeCv?.fileName ?? cvAsset?.name ?? null}
          cvError={cvError}
          notificationsEnabled={notificationsEnabled}
          onNotificationsChange={handleNotificationsChange}
          notificationError={notificationError}
          onFinish={handleFinish}
          onSkip={skipCvAndFinish}
          isPending={upsertProfile.isPending || isUploadingCv}
          bottomPadding={bottomPadding}
        />
      )}
      <ProfessionChangePaymentModal
        visible={showProfessionPaymentPrompt || professionPaymentId !== null}
        amount={2000}
        checkoutUrl={professionPaymentUrl}
        environment={professionPaymentEnvironment}
        sandboxTestPhone={professionSandboxTestPhone}
        status={professionPaymentStatus.data?.status ?? "pending"}
        failureReason={professionPaymentStatus.data?.failureReason ?? professionPaymentError}
        isCreating={createProfessionChangePayment.isPending}
        isChecking={professionPaymentStatus.isFetching || isCompletingProfessionChange}
        onPay={startProfessionChangePayment}
        onClose={() => {
          setShowProfessionPaymentPrompt(false);
          setProfessionPaymentId(null);
          setProfessionPaymentUrl(null);
          setProfessionPaymentEnvironment(null);
          setProfessionSandboxTestPhone(null);
          setProfessionPaymentError(null);
        }}
        onRetry={() => void professionPaymentStatus.refetch()}
      />
    </View>
  );
}

function WelcomeStep({
  colors,
  insets,
  onStart,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  insets: ReturnType<typeof import("react-native-safe-area-context").useSafeAreaInsets>;
  onStart: () => void;
}) {
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View
      style={[
        styles.welcomeRoot,
        {
          paddingTop: topPadding,
          paddingBottom: bottomPadding + 20,
          backgroundColor: colors.background,
        },
      ]}
    >
      <LinearGradient
        colors={[colors.background, colors.card, colors.background]}
        locations={[0, 0.56, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <View style={styles.welcomeTop}>
        <View style={styles.orbitArt}>
          <View
            style={[
              styles.orbitRing,
              styles.orbitRingOuter,
              { borderColor: colors.foreground + "16" },
            ]}
          />
          <View
            style={[
              styles.orbitRing,
              styles.orbitRingMiddle,
              { borderColor: colors.primary + "35" },
            ]}
          />
          <View
            style={[
              styles.orbitRing,
              styles.orbitRingInner,
              { borderColor: colors.foreground + "22" },
            ]}
          />
          <View
            style={[
              styles.signalCore,
              {
                backgroundColor: colors.primary + "16",
                borderColor: colors.primary + "75",
              },
            ]}
          >
            <View
              style={[
                styles.signalCoreGlow,
                { backgroundColor: colors.primary + "22" },
              ]}
            />
            <Feather name="target" size={42} color={colors.primary} />
            <View style={[styles.signalDot, { backgroundColor: colors.accent }]} />
          </View>

          <OrbitNode
            icon="file-text"
            color={colors.accent}
            position={{ left: 42, top: 68 }}
          />
          <OrbitNode
            icon="map-pin"
            color={colors.primary}
            position={{ left: 158, top: 18 }}
          />
          <OrbitNode
            icon="briefcase"
            color={colors.accent}
            position={{ right: 28, top: 83 }}
          />
          <OrbitNode
            icon="users"
            color={colors.primary}
            position={{ left: 10, top: 205 }}
          />
          <OrbitNode
            icon="award"
            color={colors.primary}
            position={{ right: 12, top: 224 }}
          />
          <OrbitNode
            icon="bell"
            color={colors.accent}
            position={{ left: 62, top: 307 }}
          />
          <OrbitNode
            icon="trending-up"
            color={colors.primary}
            position={{ right: 58, top: 313 }}
          />
        </View>

        <Text style={[styles.tagline, { color: colors.foreground }]}>
          Ton prochain match{"\n"}professionnel commence ici.
        </Text>
        <Text style={[styles.taglineSub, { color: colors.mutedForeground }]}>
          Des offres qui te ressemblent, au bon moment.
        </Text>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Commencer la configuration du profil"
        testID="onboarding-start"
        style={[styles.welcomeBtn, { backgroundColor: colors.primary }]}
        onPress={onStart}
      >
        <Text style={[styles.welcomeBtnText, { color: colors.primaryForeground }]}>
          Commencer →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function OrbitNode({
  icon,
  color,
  position,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
  position: { left?: number; right?: number; top: number };
}) {
  return (
    <View
      style={[
        styles.orbitNode,
        position,
        { backgroundColor: color + "18", borderColor: color + "75" },
      ]}
    >
      <Feather name={icon} size={21} color={color} />
    </View>
  );
}

function CvImportStep({
  colors,
  name,
  setName,
  cvName,
  cvError,
  isUploading,
  hasAnalysis,
  onPickCV,
  onContinue,
  onSkip,
  bottomPadding,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  name: string;
  setName: (value: string) => void;
  cvName: string | null;
  cvError: string | null;
  isUploading: boolean;
  hasAnalysis: boolean;
  onPickCV: () => void;
  onContinue: () => void;
  onSkip: () => void;
  bottomPadding: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>Commence par ton CV</Text>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          Importe-le pour préremplir ton profil et gagner du temps.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.reviewSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ReviewSectionTitle colors={colors} icon="user" title="Ton identité" />
          <Text style={[styles.reviewHint, { color: colors.mutedForeground }]}>
            Ton nom sera utilisé pour identifier ton profil. Il peut aussi être récupéré automatiquement depuis ton CV.
          </Text>
          <TextInput
            style={[styles.reviewInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            value={name}
            onChangeText={setName}
            placeholder="Ex. Kouassi Amani"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>

        <View style={[styles.cvCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cvCardHeader}>
            <View style={[styles.cvIcon, { backgroundColor: colors.accent + "20" }]}>
              <Feather name="file-text" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cvTitle, { color: colors.foreground }]}>Analyse intelligente</Text>
              <Text style={[styles.cvDesc, { color: colors.mutedForeground }]}>
                Métier, compétences, expérience et formation seront détectés puis vérifiés avec toi.
              </Text>
            </View>
          </View>

          {isUploading ? (
            <View style={[styles.cvProcessing, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "35" }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cvProcessingTitle, { color: colors.foreground }]}>Analyse de ton CV…</Text>
                <Text style={[styles.cvDesc, { color: colors.mutedForeground }]}>
                  Cela peut prendre quelques secondes.
                </Text>
              </View>
            </View>
          ) : cvName && hasAnalysis ? (
            <View style={[styles.cvUploaded, { backgroundColor: "#10B98115", borderColor: "#10B98135" }]}>
              <Feather name="check-circle" size={16} color="#10B981" />
              <Text style={[styles.cvFileName, { color: "#10B981" }]} numberOfLines={1}>
                {cvName}
              </Text>
              <TouchableOpacity onPress={onPickCV} accessibilityRole="button" accessibilityLabel="Changer de CV">
                <Text style={[styles.cvChange, { color: colors.mutedForeground }]}>Changer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Importer un CV"
              testID="onboarding-upload-cv"
              style={[styles.cvUploadBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
              onPress={onPickCV}
              activeOpacity={0.8}
            >
              <Feather name="upload" size={17} color={colors.primary} />
              <Text style={[styles.cvUploadText, { color: colors.primary }]}>Importer mon CV</Text>
            </TouchableOpacity>
          )}

          {cvError && <Text style={[styles.cvError, { color: "#DC2626" }]}>{cvError}</Text>}
        </View>

        <View style={[styles.reviewInfoCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <Feather name="edit-3" size={17} color={colors.primary} />
          <Text style={[styles.reviewInfoText, { color: colors.foreground }]}>
            Rien ne sera appliqué sans ta validation. Tu pourras modifier ou compléter chaque information.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPadding + 8 }]}>
        <TouchableOpacity
          accessibilityRole="button"
          testID="onboarding-cv-continue"
          style={[styles.nextBtn, { backgroundColor: isUploading || !name.trim() ? colors.secondary : colors.primary, opacity: isUploading || !name.trim() ? 0.55 : 1 }]}
          onPress={onContinue}
          disabled={isUploading || !name.trim()}
        >
          <Text style={[styles.nextBtnText, { color: isUploading || !name.trim() ? colors.mutedForeground : colors.primaryForeground }]}>
            {hasAnalysis ? "Vérifier les informations" : "Continuer sans CV"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.skipBtn, { opacity: isUploading ? 0.5 : 1 }]}
          onPress={onSkip}
          disabled={isUploading}
        >
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Remplir manuellement</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CvReviewStep({
  colors,
  analysis,
  profession,
  setProfession,
  ville,
  setVille,
  skills,
  setSkills,
  lastJobTitle,
  setLastJobTitle,
  bio,
  setBio,
  email,
  setEmail,
  phone,
  setPhone,
  cvError,
  onNext,
  isConfirming,
  bottomPadding,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  analysis: CvAnalysis;
  profession: string;
  setProfession: (value: string) => void;
  ville: string;
  setVille: (value: string) => void;
  skills: string[];
  setSkills: (value: string[]) => void;
  lastJobTitle: string;
  setLastJobTitle: (value: string) => void;
  bio: string;
  setBio: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  cvError: string | null;
  onNext: () => void;
  isConfirming: boolean;
  bottomPadding: number;
}) {
  const [newSkill, setNewSkill] = useState("");

  function addSkill() {
    const value = newSkill.trim();
    if (!value) return;
    setSkills(uniqueStrings([...skills, value]));
    setNewSkill("");
    haptic();
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>Vérifie ton profil</Text>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          Nous avons trouvé ces informations dans ton CV. Corrige-les si nécessaire.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 120, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.reviewSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ReviewSectionTitle colors={colors} icon="target" title="Objectif professionnel" />
          <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Métier recherché</Text>
          <TextInput
            style={[styles.reviewInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            value={profession}
            onChangeText={setProfession}
            placeholder="Ex. Assistant comptable"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="sentences"
          />
          <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Ville</Text>
          <TextInput
            style={[styles.reviewInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            value={ville}
            onChangeText={setVille}
            placeholder="Ex. Abidjan"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="words"
          />
        </View>

        <View style={[styles.reviewSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ReviewSectionTitle colors={colors} icon="briefcase" title="Expérience détectée" />
          <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Dernier poste</Text>
          <TextInput
            style={[styles.reviewInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            value={lastJobTitle}
            onChangeText={setLastJobTitle}
            placeholder="Poste le plus récent"
            placeholderTextColor={colors.mutedForeground}
          />
          <View style={[styles.reviewFact, { backgroundColor: colors.secondary }]}>
            <Feather name="clock" size={15} color={colors.primary} />
            <Text style={[styles.reviewFactText, { color: colors.foreground }]}>
              {analysis.yearsExperience != null
                ? `${analysis.yearsExperience} an${analysis.yearsExperience > 1 ? "s" : ""} d'expérience estimée`
                : "Expérience à préciser dans l'étape suivante"}
            </Text>
          </View>
        </View>

        <View style={[styles.reviewSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ReviewSectionTitle colors={colors} icon="check-circle" title="Compétences détectées" />
          <Text style={[styles.reviewHint, { color: colors.mutedForeground }]}>
            Supprime celles qui ne te correspondent plus ou ajoute-en d'autres.
          </Text>
          <View style={styles.reviewSkillsGrid}>
            {skills.map((skill) => (
              <TouchableOpacity
                key={skill}
                style={[styles.reviewSkillChip, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "55" }]}
                onPress={() => setSkills(skills.filter((item) => item !== skill))}
                accessibilityRole="button"
                accessibilityLabel={`Retirer ${skill}`}
              >
                <Text style={[styles.reviewSkillText, { color: colors.primary }]}>{skill}</Text>
                <Feather name="x" size={12} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.reviewAddRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="plus" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.reviewAddInput, { color: colors.foreground }]}
              value={newSkill}
              onChangeText={setNewSkill}
              onSubmitEditing={addSkill}
              placeholder="Ajouter une compétence"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
            />
            {newSkill.trim().length > 0 && (
              <TouchableOpacity onPress={addSkill} accessibilityRole="button" accessibilityLabel="Ajouter la compétence">
                <Feather name="arrow-up-circle" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {(analysis.education[0]?.degree || bio || email || phone) && (
          <View style={[styles.reviewSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ReviewSectionTitle colors={colors} icon="layers" title="Autres informations" />
            {analysis.education[0]?.degree && (
              <View style={[styles.reviewFact, { backgroundColor: colors.secondary }]}>
                <Feather name="book-open" size={15} color={colors.primary} />
                <Text style={[styles.reviewFactText, { color: colors.foreground }]}>
                  {analysis.education[0].degree}
                  {analysis.education[0].school ? ` — ${analysis.education[0].school}` : ""}
                </Text>
              </View>
            )}
            <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Présentation</Text>
            <TextInput
              style={[styles.reviewTextArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Ajoute quelques mots sur ton parcours"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
            />
            {email.length > 0 && (
              <>
                <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Email détecté</Text>
                <TextInput
                  style={[styles.reviewInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.mutedForeground}
                />
              </>
            )}
            {phone.length > 0 && (
              <>
                <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Téléphone détecté</Text>
                <TextInput
                  style={[styles.reviewInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.mutedForeground}
                />
              </>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPadding + 8 }]}>
        <TouchableOpacity
          style={[
            styles.nextBtn,
            {
              backgroundColor: profession.trim() && !isConfirming ? colors.primary : colors.secondary,
              opacity: profession.trim() && !isConfirming ? 1 : 0.5,
            },
          ]}
          onPress={onNext}
          disabled={!profession.trim() || isConfirming}
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.nextBtnText, { color: profession.trim() ? colors.primaryForeground : colors.mutedForeground }]}>
              Confirmer et activer les notifications
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ReviewSectionTitle({
  colors,
  icon,
  title,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
}) {
  return (
    <View style={styles.reviewSectionTitle}>
      <Feather name={icon} size={16} color={colors.primary} />
      <Text style={[styles.reviewSectionTitleText, { color: colors.foreground }]}>{title}</Text>
    </View>
  );
}

function MetierStep({
  colors,
  profession,
  setProfession,
  search,
  setSearch,
  activeCategory,
  setActiveCategory,
  filteredProfessions,
  customMetierExact,
  onNext,
  canNext,
  bottomPadding,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  profession: string;
  setProfession: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  activeCategory: string | null;
  setActiveCategory: (v: string | null) => void;
  filteredProfessions: { profession: string; category: (typeof CATEGORIES)[0] }[] | null;
  customMetierExact: boolean;
  onNext: () => void;
  canNext: boolean;
  bottomPadding: number;
}) {
  const cat = CATEGORIES.find((c) => c.id === activeCategory);

  function addCustomMetier() {
    const val = search.trim();
    if (!val) return;
    setProfession(val);
    setSearch("");
    haptic();
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>Ton métier</Text>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          Quel type de poste recherches-tu ?
        </Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Rechercher ou saisir un métier..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            setActiveCategory(null);
          }}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredProfessions !== null ? (
          <View style={{ gap: 6, marginTop: 4 }}>
            {filteredProfessions.map(({ profession: p, category }) => (
              <ProfessionRow
                key={p}
                profession={p}
                categoryColor={category.color}
                categoryLabel={category.label}
                selected={profession === p}
                onPress={() => { setProfession(p); haptic(); setSearch(""); }}
                colors={colors}
              />
            ))}
            {customMetierExact && search.trim().length > 0 && (
              <TouchableOpacity
                style={[styles.customAddRow, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "40" }]}
                onPress={addCustomMetier}
                activeOpacity={0.75}
              >
                <View style={[styles.customAddIcon, { backgroundColor: colors.primary + "20" }]}>
                  <Feather name="plus" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.customAddLabel, { color: colors.primary }]}>
                    Ajouter « {search.trim()} »
                  </Text>
                  <Text style={[styles.customAddSub, { color: colors.mutedForeground }]}>
                    Métier personnalisé
                  </Text>
                </View>
                <Feather name="arrow-right" size={15} color={colors.primary} />
              </TouchableOpacity>
            )}
            {filteredProfessions.length === 0 && !customMetierExact && (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Aucun résultat</Text>
            )}
          </View>
        ) : cat ? (
          <View style={{ gap: 6, marginTop: 4 }}>
            <TouchableOpacity
              style={styles.backCategoryBtn}
              onPress={() => { setActiveCategory(null); haptic(); }}
            >
              <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
              <Text style={[styles.backCategoryText, { color: colors.mutedForeground }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
            {cat.professions.map((p) => (
              <ProfessionRow
                key={p}
                profession={p}
                categoryColor={cat.color}
                categoryLabel=""
                selected={profession === p}
                onPress={() => { setProfession(p); haptic(); }}
                colors={colors}
              />
            ))}
            <TouchableOpacity
              style={[styles.customAddRow, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 4 }]}
              onPress={() => {
                setActiveCategory(null);
                haptic();
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.customAddIcon, { backgroundColor: colors.mutedForeground + "20" }]}>
                <Feather name="edit-2" size={14} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.customAddLabel, { color: colors.mutedForeground }]}>
                Mon métier n'est pas dans la liste
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 4 }}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.categoryCard, { backgroundColor: c.bg, borderColor: c.color + "40" }]}
                onPress={() => { setActiveCategory(c.id); haptic(); }}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIcon, { backgroundColor: c.color + "25" }]}>
                  <Feather name={c.icon} size={20} color={c.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.categoryLabel, { color: colors.foreground }]}>{c.label}</Text>
                  <Text style={[styles.categoryCount, { color: colors.mutedForeground }]}>
                    {c.professions.length} métiers
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {profession.length > 0 && (
        <View style={[styles.selectionBar, { backgroundColor: "#10B98115", borderColor: "#10B98140" }]}>
          <Feather name="check-circle" size={16} color="#10B981" />
          <Text style={[styles.selectionText, { color: "#10B981" }]} numberOfLines={1}>
            {profession}
          </Text>
        </View>
      )}

      <View style={[styles.footer, { paddingBottom: bottomPadding + 8 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: canNext ? colors.primary : colors.secondary, opacity: canNext ? 1 : 0.5 }]}
          onPress={onNext}
          disabled={!canNext}
        >
          <Text style={[styles.nextBtnText, { color: canNext ? colors.primaryForeground : colors.mutedForeground }]}>
            Continuer
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProfessionRow({
  profession,
  categoryColor,
  categoryLabel,
  selected,
  onPress,
  colors,
}: {
  profession: string;
  categoryColor: string;
  categoryLabel: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.professionRow,
        {
          backgroundColor: selected ? categoryColor + "15" : colors.card,
          borderColor: selected ? categoryColor : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.professionDot, { backgroundColor: categoryColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.professionName, { color: colors.foreground }]}>{profession}</Text>
        {categoryLabel.length > 0 && (
          <Text style={[styles.professionCategory, { color: colors.mutedForeground }]}>
            {categoryLabel}
          </Text>
        )}
      </View>
      {selected && <Feather name="check" size={16} color={categoryColor} />}
    </TouchableOpacity>
  );
}

function VilleStep({
  colors,
  ville,
  setVille,
  onNext,
  bottomPadding,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  ville: string;
  setVille: (v: string) => void;
  onNext: () => void;
  bottomPadding: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>Ta ville</Text>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          Dans quelle ville cherches-tu à travailler ?
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 100, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.villeGrid}>
          {VILLES.map((v) => {
            const selected = ville === v.name;
            return (
              <TouchableOpacity
                key={v.name}
                style={[
                  styles.villeCard,
                  {
                    backgroundColor: selected ? colors.primary + "18" : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => { setVille(v.name); haptic(); }}
                activeOpacity={0.75}
              >
                <View style={[styles.villeIconWrap, { backgroundColor: selected ? colors.primary + "25" : colors.border + "60" }]}>
                  <Feather name="map-pin" size={18} color={selected ? colors.primary : colors.mutedForeground} />
                </View>
                <Text style={[styles.villeName, { color: colors.foreground }]}>{v.name}</Text>
                <Text style={[styles.villeSublabel, { color: colors.mutedForeground }]}>{v.sublabel}</Text>
                {selected && (
                  <View style={[styles.villeCheck, { backgroundColor: colors.primary }]}>
                    <Feather name="check" size={11} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.villeHint, { color: colors.mutedForeground }]}>
          Tu pourras modifier ta ville à tout moment depuis ton profil.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPadding + 8 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: ville ? colors.primary : colors.secondary, opacity: ville ? 1 : 0.5 }]}
          onPress={onNext}
          disabled={!ville}
        >
          <Text style={[styles.nextBtnText, { color: ville ? colors.primaryForeground : colors.mutedForeground }]}>
            Continuer
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SkillsStep({
  colors,
  skills,
  setSkills,
  onNext,
  canNext,
  bottomPadding,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  skills: string[];
  setSkills: (v: string[]) => void;
  onNext: () => void;
  canNext: boolean;
  bottomPadding: number;
}) {
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [customSkill, setCustomSkill] = useState("");

  const allBuiltIn = useMemo(() => SKILL_CATEGORIES.flatMap((c) => c.skills), []);
  const customSkills = useMemo(() => skills.filter((s) => !allBuiltIn.includes(s)), [skills, allBuiltIn]);

  function toggleSkill(s: string) {
    haptic();
    if (skills.includes(s)) {
      setSkills(skills.filter((x) => x !== s));
    } else {
      setSkills([...skills, s]);
    }
  }

  function addCustomSkill() {
    const val = customSkill.trim();
    if (!val || skills.includes(val)) { setCustomSkill(""); return; }
    setSkills([...skills, val]);
    setCustomSkill("");
    haptic();
  }

  const activeCat = activeCatId ? SKILL_CATEGORIES.find((c) => c.id === activeCatId) : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>Tes compétences</Text>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          {activeCat ? activeCat.label : "Choisis une catégorie pour commencer."}
        </Text>
      </View>

      <View style={[styles.skillsCounterRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="check-circle" size={14} color={skills.length > 0 ? colors.primary : colors.mutedForeground} />
        <Text style={[styles.skillsCounterText, { color: skills.length > 0 ? colors.primary : colors.mutedForeground }]}>
          {skills.length} compétence{skills.length !== 1 ? "s" : ""} sélectionnée{skills.length !== 1 ? "s" : ""}
        </Text>
        {skills.length > 0 && (
          <TouchableOpacity onPress={() => setSkills([])}>
            <Text style={[styles.skillsClearText, { color: colors.mutedForeground }]}>Tout effacer</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 100, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {activeCat ? (
          <>
            <TouchableOpacity
              style={styles.backCategoryBtn}
              onPress={() => { setActiveCatId(null); haptic(); }}
            >
              <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
              <Text style={[styles.backCategoryText, { color: colors.mutedForeground }]}>Toutes les catégories</Text>
            </TouchableOpacity>

            <View style={[styles.customSkillRow, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 14 }]}>
              <Feather name="plus-circle" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.customSkillInput, { color: colors.foreground }]}
                placeholder="Ajouter une compétence personnalisée..."
                placeholderTextColor={colors.mutedForeground}
                value={customSkill}
                onChangeText={setCustomSkill}
                onSubmitEditing={addCustomSkill}
                returnKeyType="done"
              />
              {customSkill.trim().length > 0 && (
                <TouchableOpacity
                  style={[styles.customSkillAddBtn, { backgroundColor: colors.primary }]}
                  onPress={addCustomSkill}
                >
                  <Text style={[styles.customSkillAddText, { color: colors.primaryForeground }]}>Ajouter</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.skillsGrid}>
              {activeCat.skills.map((s) => {
                const selected = skills.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.skillChip,
                      {
                        backgroundColor: selected ? activeCat.color + "20" : colors.card,
                        borderColor: selected ? activeCat.color : colors.border,
                      },
                    ]}
                    onPress={() => toggleSkill(s)}
                    activeOpacity={0.75}
                  >
                    {selected && <Feather name="check" size={12} color={activeCat.color} />}
                    <Text style={[styles.skillText, { color: selected ? activeCat.color : colors.foreground }]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            {customSkills.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.skillCatLabel, { color: colors.mutedForeground }]}>Personnalisées</Text>
                <View style={styles.skillsGrid}>
                  {customSkills.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.skillChip, { backgroundColor: colors.accent + "20", borderColor: colors.accent }]}
                      onPress={() => toggleSkill(s)}
                      activeOpacity={0.75}
                    >
                      <Feather name="check" size={12} color={colors.accent} />
                      <Text style={[styles.skillText, { color: colors.accent }]}>{s}</Text>
                      <Feather name="x" size={11} color={colors.accent} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.catGrid}>
              {SKILL_CATEGORIES.map((c) => {
                const selectedInCat = c.skills.filter((s) => skills.includes(s)).length;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.catGridCard,
                      {
                        backgroundColor: selectedInCat > 0 ? c.color + "12" : colors.card,
                        borderColor: selectedInCat > 0 ? c.color + "60" : colors.border,
                      },
                    ]}
                    onPress={() => { setActiveCatId(c.id); haptic(); }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.catGridIcon, { backgroundColor: c.color + "20" }]}>
                      <Feather name={c.icon} size={20} color={c.color} />
                    </View>
                    <Text style={[styles.catGridLabel, { color: colors.foreground }]} numberOfLines={2}>
                      {c.label}
                    </Text>
                    {selectedInCat > 0 ? (
                      <View style={[styles.catGridBadge, { backgroundColor: c.color }]}>
                        <Text style={styles.catGridBadgeText}>{selectedInCat}</Text>
                      </View>
                    ) : (
                      <Feather name="chevron-right" size={13} color={colors.mutedForeground} style={{ alignSelf: "flex-end" }} />
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.catGridCard, { backgroundColor: colors.card, borderColor: colors.border, borderStyle: "dashed" as const }]}
                onPress={() => { setActiveCatId(SKILL_CATEGORIES[0].id); haptic(); }}
                activeOpacity={0.75}
              >
                <View style={[styles.catGridIcon, { backgroundColor: colors.mutedForeground + "20" }]}>
                  <Feather name="plus" size={20} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.catGridLabel, { color: colors.mutedForeground }]}>
                  Autre compétence
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPadding + 8 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: canNext ? colors.primary : colors.secondary, opacity: canNext ? 1 : 0.5 }]}
          onPress={onNext}
          disabled={!canNext}
        >
          <Text style={[styles.nextBtnText, { color: canNext ? colors.primaryForeground : colors.mutedForeground }]}>
            Continuer
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DiplomaStep({
  colors,
  diploma,
  setDiploma,
  onNext,
  bottomPadding,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  diploma: string | null;
  setDiploma: (v: string | null) => void;
  onNext: () => void;
  bottomPadding: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>Ton diplôme</Text>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          Quel est ton niveau de formation ? (optionnel)
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 100, gap: 10, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {DIPLOMA_LEVELS.map((lvl) => {
          const selected = diploma === lvl.id;
          return (
            <TouchableOpacity
              key={lvl.id}
              style={[
                styles.expCard,
                {
                  backgroundColor: selected ? lvl.color + "15" : colors.card,
                  borderColor: selected ? lvl.color : colors.border,
                },
              ]}
              onPress={() => {
                setDiploma(selected ? null : lvl.id);
                haptic();
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.expIconWrap, { backgroundColor: lvl.color + (selected ? "30" : "18") }]}>
                <Feather name={lvl.icon} size={22} color={lvl.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.expLabel, { color: colors.foreground }]}>{lvl.label}</Text>
                <Text style={[styles.expSublabel, { color: colors.mutedForeground }]}>{lvl.sublabel}</Text>
              </View>
              <View
                style={[
                  styles.expRadio,
                  {
                    borderColor: selected ? lvl.color : colors.border,
                    backgroundColor: selected ? lvl.color : "transparent",
                  },
                ]}
              >
                {selected && <Feather name="check" size={12} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPadding + 8 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          onPress={onNext}
        >
          <Text style={[styles.nextBtnText, { color: colors.primaryForeground }]}>
            {diploma ? "Continuer" : "Passer cette étape"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ExperienceStep({
  colors,
  experienceLevelId,
  setExperienceLevelId,
  onNext,
  canNext,
  bottomPadding,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  experienceLevelId: number | null;
  setExperienceLevelId: (v: number) => void;
  onNext: () => void;
  canNext: boolean;
  bottomPadding: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>Ton expérience</Text>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          Depuis combien de temps travailles-tu dans ton domaine ?
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 100, gap: 10, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {EXPERIENCE_LEVELS.map((lvl) => {
          const selected = experienceLevelId === lvl.id;
          return (
            <TouchableOpacity
              key={lvl.id}
              style={[
                styles.expCard,
                {
                  backgroundColor: selected ? lvl.color + "15" : colors.card,
                  borderColor: selected ? lvl.color : colors.border,
                },
              ]}
              onPress={() => { setExperienceLevelId(lvl.id); haptic(); }}
              activeOpacity={0.75}
            >
              <View style={[styles.expIconWrap, { backgroundColor: lvl.color + (selected ? "30" : "18") }]}>
                <Feather name={lvl.icon} size={22} color={lvl.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.expLabel, { color: colors.foreground }]}>{lvl.label}</Text>
                <Text style={[styles.expSublabel, { color: colors.mutedForeground }]}>{lvl.sublabel}</Text>
              </View>
              <View
                style={[
                  styles.expRadio,
                  {
                    borderColor: selected ? lvl.color : colors.border,
                    backgroundColor: selected ? lvl.color : "transparent",
                  },
                ]}
              >
                {selected && <Feather name="check" size={12} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPadding + 8 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: canNext ? colors.primary : colors.secondary, opacity: canNext ? 1 : 0.5 }]}
          onPress={onNext}
          disabled={!canNext}
        >
          <Text style={[styles.nextBtnText, { color: canNext ? colors.primaryForeground : colors.mutedForeground }]}>
            Continuer
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FinishStep({
  colors,
  cvName,
  cvError,
  notificationsEnabled,
  onNotificationsChange,
  notificationError,
  onFinish,
  onSkip,
  isPending,
  bottomPadding,
}: {
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  cvName: string | null;
  cvError: string | null;
  notificationsEnabled: boolean;
  onNotificationsChange: (v: boolean) => void;
  notificationError: string | null;
  onFinish: () => void;
  onSkip: () => void;
  isPending: boolean;
  bottomPadding: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>Finalise ton profil</Text>
        <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
          Ces étapes sont facultatives mais augmentent tes chances d'être contacté.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 120 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.cvCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cvCardHeader}>
            <View style={[styles.cvIcon, { backgroundColor: colors.accent + "20" }]}>
              <Feather name="file-text" size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cvTitle, { color: colors.foreground }]}>Ton CV</Text>
              <Text style={[styles.cvDesc, { color: colors.mutedForeground }]}>
                PDF, DOCX ou fichier texte. Il sera analysé pour améliorer ton matching.
              </Text>
            </View>
            {cvName && <Feather name="check-circle" size={20} color="#10B981" />}
          </View>

          {cvName ? (
            <View style={[styles.cvUploaded, { backgroundColor: "#10B98115", borderColor: "#10B98135" }]}>
              <Feather name="file" size={14} color="#10B981" />
              <Text style={[styles.cvFileName, { color: "#10B981" }]} numberOfLines={1}>
                {cvName}
              </Text>
              <Text style={[styles.cvChange, { color: colors.mutedForeground }]}>Validé</Text>
            </View>
          ) : (
            <View style={[styles.reviewFact, { backgroundColor: colors.secondary }]}>
              <Feather name="info" size={15} color={colors.mutedForeground} />
              <Text style={[styles.reviewFactText, { color: colors.mutedForeground }]}>
                Tu pourras ajouter un CV plus tard depuis ton profil.
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.notifCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cvIcon2}>
            <View style={[styles.notifIconBg, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="bell" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cvTitle, { color: colors.foreground }]}>Notifications</Text>
              <Text style={[styles.cvDesc, { color: colors.mutedForeground }]}>
                Reçois une alerte dès qu'une offre correspond à ton profil
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={onNotificationsChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          {notificationError && (
            <Text style={[styles.cvError, { color: "#DC2626" }]}>{notificationError}</Text>
          )}
          {cvError && (
            <Text style={[styles.cvError, { color: "#DC2626" }]}>{cvError}</Text>
          )}
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <Feather name="star" size={16} color={colors.primary} />
          <Text style={[styles.summaryText, { color: colors.foreground }]}>
            Tu es prêt à recevoir des offres personnalisées !
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPadding + 8 }]}>
        <TouchableOpacity
          style={[styles.finishBtn, { backgroundColor: colors.primary }]}
          onPress={onFinish}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Feather name="check" size={18} color={colors.primaryForeground} />
              <Text style={[styles.nextBtnText, { color: colors.primaryForeground }]}>
                Voir mes offres
              </Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.skipBtn, { opacity: isPending ? 0.5 : 1 }]}
          onPress={onSkip}
          disabled={isPending}
        >
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
            Passer cette étape
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProfessionChangePaymentModal({
  visible,
  amount,
  checkoutUrl,
  environment,
  sandboxTestPhone,
  status,
  failureReason,
  isCreating,
  isChecking,
  onPay,
  onClose,
  onRetry,
}: {
  visible: boolean;
  amount: number;
  checkoutUrl: string | null;
  environment: "sandbox" | "live" | null;
  sandboxTestPhone: string | null;
  status: string;
  failureReason: string | null;
  isCreating: boolean;
  isChecking: boolean;
  onPay: () => void;
  onClose: () => void;
  onRetry: () => void;
}) {
  const colors = useColors();
  const completed = status === "completed";
  const failed = status === "failed";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={professionPaymentStyles.overlay}>
        <View style={[professionPaymentStyles.sheet, { backgroundColor: colors.card }]}>
          <View style={[professionPaymentStyles.handle, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={professionPaymentStyles.close} onPress={onClose}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={[professionPaymentStyles.icon, {
            backgroundColor: completed ? "#10B98120" : failed ? "#DC262620" : colors.primary + "20",
          }]}>
            <Feather
              name={completed ? "check-circle" : failed ? "alert-circle" : "briefcase"}
              size={28}
              color={completed ? "#10B981" : failed ? "#DC2626" : colors.primary}
            />
          </View>
          <Text style={[professionPaymentStyles.title, { color: colors.foreground }]}>
            {completed ? "Métier changé" : failed ? "Paiement échoué" : "Changer de métier"}
          </Text>
          <Text style={[professionPaymentStyles.description, { color: colors.mutedForeground }]}>
            {completed
              ? "Ton nouveau métier est maintenant pris en compte pour tes offres."
              : failed
                ? (failureReason ?? "Le paiement n’a pas été confirmé.")
                : `Tu as déjà changé de métier ce mois-ci. Pour continuer maintenant, paie ${amount.toLocaleString("fr-FR")} XOF.`}
          </Text>

          {!completed && !failed && (
            <>
              <View style={[professionPaymentStyles.amountCard, {
                backgroundColor: colors.background,
                borderColor: colors.border,
              }]}>
                <Text style={[professionPaymentStyles.amountLabel, { color: colors.mutedForeground }]}>
                  Montant du changement
                </Text>
                <Text style={[professionPaymentStyles.amount, { color: colors.foreground }]}>
                  {amount.toLocaleString("fr-FR")} XOF
                </Text>
              </View>

              {environment === "sandbox" && sandboxTestPhone && (
                <Text style={[professionPaymentStyles.notice, { color: colors.mutedForeground }]}>
                  Mode test : utilise le numéro {sandboxTestPhone} dans Hub2.
                </Text>
              )}

              {failureReason && (
                <Text style={[professionPaymentStyles.error, { color: "#DC2626" }]}>
                  {failureReason}
                </Text>
              )}

              {checkoutUrl ? (
                <TouchableOpacity
                  style={[professionPaymentStyles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    const openRequest = Platform.OS === "web"
                      ? Linking.openURL(checkoutUrl)
                      : WebBrowser.openBrowserAsync(checkoutUrl);
                    void openRequest;
                  }}
                  disabled={isChecking}
                >
                  <Text style={[professionPaymentStyles.primaryButtonText, { color: colors.primaryForeground }]}>
                    Ouvrir le paiement
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[professionPaymentStyles.primaryButton, { backgroundColor: colors.primary, opacity: isCreating ? 0.7 : 1 }]}
                  onPress={onPay}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text style={[professionPaymentStyles.primaryButtonText, { color: colors.primaryForeground }]}>
                      Payer {amount.toLocaleString("fr-FR")} XOF
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {checkoutUrl && (
                <Text style={[professionPaymentStyles.pending, { color: colors.mutedForeground }]}>
                  {isChecking ? "Vérification du paiement…" : "Après le paiement, garde cette fenêtre ouverte quelques secondes."}
                </Text>
              )}
            </>
          )}

          {failed && (
            <TouchableOpacity
              style={[professionPaymentStyles.secondaryButton, { borderColor: colors.border }]}
              onPress={onRetry}
            >
              <Text style={[professionPaymentStyles.secondaryButtonText, { color: colors.foreground }]}>
                Vérifier à nouveau
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} style={professionPaymentStyles.cancelButton}>
            <Text style={[professionPaymentStyles.cancelText, { color: colors.mutedForeground }]}>
              {completed ? "Fermer" : "Annuler"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  navbar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#262626",
    overflow: "hidden",
    marginBottom: 2,
  },
  progressFill: { height: 4, borderRadius: 2 },
  stepCounter: { fontFamily: "Geist_500Medium", fontSize: 12, marginBottom: 2 },

  welcomeRoot: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  welcomeTop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 8,
  },
  orbitArt: {
    width: "100%",
    maxWidth: 380,
    height: 392,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 2,
  },
  orbitRing: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
  },
  orbitRingOuter: {
    width: 380,
    height: 380,
  },
  orbitRingMiddle: {
    width: 302,
    height: 302,
  },
  orbitRingInner: {
    width: 218,
    height: 218,
  },
  signalCore: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  signalCoreGlow: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  signalDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    top: 19,
    right: 26,
  },
  orbitNode: {
    position: "absolute",
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  tagline: {
    fontFamily: "Geist_700Bold",
    fontSize: 23,
    textAlign: "center",
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  taglineSub: {
    fontFamily: "Geist_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  welcomeBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  welcomeBtnText: { fontFamily: "Geist_700Bold", fontSize: 17, letterSpacing: 0.3 },

  stepHeader: { paddingHorizontal: 20, paddingVertical: 16, gap: 4 },
  stepTitle: { fontFamily: "Geist_700Bold", fontSize: 24, letterSpacing: -0.5 },
  stepDesc: { fontFamily: "Geist_400Regular", fontSize: 14, lineHeight: 20 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontFamily: "Geist_400Regular", fontSize: 14 },

  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  categoryIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  categoryLabel: { fontFamily: "Geist_600SemiBold", fontSize: 14 },
  categoryCount: { fontFamily: "Geist_400Regular", fontSize: 12, marginTop: 1 },

  backCategoryBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  backCategoryText: { fontFamily: "Geist_500Medium", fontSize: 13 },

  professionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  professionDot: { width: 8, height: 8, borderRadius: 4 },
  professionName: { fontFamily: "Geist_500Medium", fontSize: 14 },
  professionCategory: { fontFamily: "Geist_400Regular", fontSize: 11, marginTop: 1 },

  customAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  customAddIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  customAddLabel: { fontFamily: "Geist_600SemiBold", fontSize: 14 },
  customAddSub: { fontFamily: "Geist_400Regular", fontSize: 11, marginTop: 1 },

  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectionText: { fontFamily: "Geist_500Medium", fontSize: 13, flex: 1 },

  emptyText: { fontFamily: "Geist_400Regular", fontSize: 14, textAlign: "center", paddingTop: 20 },

  villeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 4, paddingBottom: 16 },
  villeCard: {
    width: "47%",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
    alignItems: "flex-start",
    position: "relative",
  },
  villeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  villeName: { fontFamily: "Geist_600SemiBold", fontSize: 15 },
  villeSublabel: { fontFamily: "Geist_400Regular", fontSize: 11, lineHeight: 15 },
  villeCheck: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  villeHint: { fontFamily: "Geist_400Regular", fontSize: 12, textAlign: "center", lineHeight: 18, paddingHorizontal: 16 },

  skillsCounterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  skillsCounterText: { fontFamily: "Geist_500Medium", fontSize: 13, flex: 1 },
  skillsClearText: { fontFamily: "Geist_400Regular", fontSize: 12 },

  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 4,
  },
  catGridCard: {
    width: "47%",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
    alignItems: "flex-start",
  },
  catGridIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  catGridLabel: {
    fontFamily: "Geist_500Medium",
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  catGridBadge: {
    alignSelf: "flex-end",
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  catGridBadgeText: {
    fontFamily: "Geist_700Bold",
    fontSize: 11,
    color: "#fff",
  },

  customSkillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  customSkillInput: { flex: 1, fontFamily: "Geist_400Regular", fontSize: 13 },
  customSkillAddBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  customSkillAddText: { fontFamily: "Geist_600SemiBold", fontSize: 12 },

  skillCatLabel: {
    fontFamily: "Geist_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  skillText: { fontFamily: "Geist_500Medium", fontSize: 13 },

  cvCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 12,
  },
  cvCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cvIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cvTitle: { fontFamily: "Geist_600SemiBold", fontSize: 15, marginBottom: 2 },
  cvDesc: { fontFamily: "Geist_400Regular", fontSize: 13, lineHeight: 18 },
  cvUploaded: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cvFileName: { fontFamily: "Geist_500Medium", fontSize: 13, flex: 1 },
  cvChange: { fontFamily: "Geist_400Regular", fontSize: 12 },
  cvProcessing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cvProcessingTitle: { fontFamily: "Geist_600SemiBold", fontSize: 14, marginBottom: 2 },
  cvUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed" as const,
  },
  cvError: { fontFamily: "Geist_400Regular", fontSize: 12, lineHeight: 17, marginTop: 8 },
  cvUploadText: { fontFamily: "Geist_500Medium", fontSize: 14 },

  reviewInfoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  reviewInfoText: { fontFamily: "Geist_400Regular", fontSize: 13, lineHeight: 19, flex: 1 },
  reviewSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  reviewSectionTitle: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  reviewSectionTitleText: { fontFamily: "Geist_700Bold", fontSize: 15 },
  reviewLabel: { fontFamily: "Geist_500Medium", fontSize: 12, marginTop: 3 },
  reviewHint: { fontFamily: "Geist_400Regular", fontSize: 12, lineHeight: 17 },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: "Geist_400Regular",
    fontSize: 14,
  },
  reviewTextArea: {
    minHeight: 84,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: "Geist_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  reviewFact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  reviewFactText: { fontFamily: "Geist_500Medium", fontSize: 13, lineHeight: 18, flex: 1 },
  reviewSkillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, paddingTop: 2 },
  reviewSkillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  reviewSkillText: { fontFamily: "Geist_500Medium", fontSize: 12 },
  reviewAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 3,
  },
  reviewAddInput: { flex: 1, fontFamily: "Geist_400Regular", fontSize: 13, paddingVertical: 8 },

  notifCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  cvIcon2: { flexDirection: "row", alignItems: "center", gap: 12 },
  notifIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryText: { fontFamily: "Geist_500Medium", fontSize: 14, flex: 1, lineHeight: 20 },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  nextBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextBtnText: { fontFamily: "Geist_600SemiBold", fontSize: 16 },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipText: { fontFamily: "Geist_400Regular", fontSize: 13 },

  expCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  expIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  expLabel: { fontFamily: "Geist_600SemiBold", fontSize: 15, marginBottom: 3 },
  expSublabel: { fontFamily: "Geist_400Regular", fontSize: 12, lineHeight: 17 },
  expRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});

const professionPaymentStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 34,
    alignItems: "center",
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  close: {
    alignSelf: "flex-end",
    padding: 6,
    marginBottom: 4,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: "Geist_700Bold",
    fontSize: 23,
    textAlign: "center",
  },
  description: {
    fontFamily: "Geist_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 340,
  },
  amountCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 20,
  },
  amountLabel: {
    fontFamily: "Geist_400Regular",
    fontSize: 12,
  },
  amount: {
    fontFamily: "Geist_700Bold",
    fontSize: 26,
    marginTop: 3,
  },
  notice: {
    fontFamily: "Geist_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },
  error: {
    fontFamily: "Geist_500Medium",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
  },
  primaryButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  primaryButtonText: {
    fontFamily: "Geist_600SemiBold",
    fontSize: 15,
  },
  pending: {
    fontFamily: "Geist_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },
  secondaryButton: {
    width: "100%",
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  secondaryButtonText: {
    fontFamily: "Geist_600SemiBold",
    fontSize: 14,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  cancelText: {
    fontFamily: "Geist_500Medium",
    fontSize: 14,
  },
});
