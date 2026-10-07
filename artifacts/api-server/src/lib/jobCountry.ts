import { eq } from "drizzle-orm";
import { jobsTable } from "@workspace/db";

export const TARGET_JOB_COUNTRY = "Côte d'Ivoire";

/**
 * The local jobs table is scoped to the Ivorian market. Country is persisted
 * from the external feed, so reads must use that field rather than inferring
 * a country from a location or a historical source URL.
 */
export function coteDIvoireJobCondition() {
  return eq(jobsTable.country, TARGET_JOB_COUNTRY);
}

export function normalizeCountry(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCoteDIvoireCountry(value: string | null | undefined): boolean {
  return normalizeCountry(value) === "cote d ivoire";
}

export function canonicalJobCountry(value: string | null | undefined): string {
  return isCoteDIvoireCountry(value)
    ? TARGET_JOB_COUNTRY
    : (value?.trim() || "legacy-unknown");
}