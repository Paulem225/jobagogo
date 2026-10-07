import { Alert, Platform, Share } from "react-native";

export function getPublicJobUrl(jobId: number): string {
  const configuredOrigin = process.env.EXPO_PUBLIC_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const origin = configuredOrigin || "https://jobagogo.pro";
  return `${origin}/partage/offre/${jobId}`;
}

export function getJobShareMessage(job: {
  id: number;
  title: string;
  company: string;
  location: string;
}, options: { includeUrl?: boolean } = {}): string {
  const lines = [
    "J’ai trouvé cette opportunité sur Jobagogo 👇",
    "",
    `📍 ${job.location}`,
    "",
    "Découvre l’aperçu de l’offre :",
  ];

  if (options.includeUrl !== false) {
    lines.push(getPublicJobUrl(job.id));
  }

  return lines.join("\n");
}

export async function shareJobOffer(job: {
  id: number;
  title: string;
  company: string;
  location: string;
}): Promise<void> {
  const url = getPublicJobUrl(job.id);
  const message = getJobShareMessage(job);

  try {
    await Share.share({
      title: `${job.title} — ${job.company}`,
      message: Platform.OS === "ios"
        ? getJobShareMessage(job, { includeUrl: false })
        : message,
      url: Platform.OS === "ios" ? url : undefined,
    });
  } catch {
    Alert.alert(
      "Partage indisponible",
      "Le lien n’a pas pu être partagé. Tu peux le copier depuis la fiche de l’offre.",
    );
  }
}