import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import type { DocumentPickerAsset } from "expo-document-picker";
import type { CvDocument } from "@workspace/api-client-react";
import { getAuthToken } from "@/lib/authSession";

function apiUrl(path: string) {
  const configuredOrigin = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (configuredOrigin) return `${configuredOrigin}${path}`;

  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (!domain) throw new Error("API domain is not configured");
  return `https://${domain}${path}`;
}

export async function uploadCvAsset(
  asset: DocumentPickerAsset,
  options?: { enrichProfile?: boolean },
): Promise<CvDocument> {
  const formData = new FormData();
  const file = PlatformFile(asset);
  formData.append("file", file as unknown as Blob, asset.name);

  const enrichQuery = options?.enrichProfile === false ? "?enrich=false" : "";
  const authToken = await getAuthToken();
  if (!authToken) {
    throw new Error("Connexion requise.");
  }

  const response = await expoFetch(apiUrl(`/api/profile/cvs${enrichQuery}`), {
    method: "POST",
    body: formData,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });

  const body = await response.json() as CvDocument | { error?: string };
  if (!response.ok) {
    throw new Error("error" in body && body.error ? body.error : "Impossible d'analyser le CV");
  }
  return body as CvDocument;
}

function PlatformFile(asset: DocumentPickerAsset): Blob | File {
  if (asset.file) return asset.file;
  return new File(asset.uri);
}