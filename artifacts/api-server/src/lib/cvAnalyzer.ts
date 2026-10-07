import { logger } from "./logger";

export interface CvExperience {
  title: string;
  company: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  current: boolean;
  description: string;
  skills: string[];
}

export interface CvEducation {
  degree: string;
  school: string;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface CvAnalysis {
  fullName: string | null;
  headline: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  skills: string[];
  softSkills: string[];
  languages: string[];
  yearsExperience: number | null;
  experiences: CvExperience[];
  education: CvEducation[];
  certifications: string[];
  sectors: string[];
  desiredRoles: string[];
}

const EMPTY_ANALYSIS: CvAnalysis = {
  fullName: null,
  headline: null,
  email: null,
  phone: null,
  location: null,
  summary: null,
  skills: [],
  softSkills: [],
  languages: [],
  yearsExperience: null,
  experiences: [],
  education: [],
  certifications: [],
  sectors: [],
  desiredRoles: [],
};

const SYSTEM_PROMPT = `Tu es un recruteur expert du marché de l'emploi africain francophone.
Analyse le CV fourni et retourne UNIQUEMENT un JSON valide, sans markdown.
Extrais le maximum d'informations utiles au matching, sans inventer de données.
Utilise null pour une information inconnue et [] pour une liste inconnue.
Les dates doivent rester dans le format visible dans le CV.
Pour yearsExperience, calcule une estimation raisonnable à partir des expériences, sinon null.

Format obligatoire :
{
  "fullName": "Nom complet ou null",
  "headline": "Titre professionnel principal ou null",
  "email": "email ou null",
  "phone": "téléphone ou null",
  "location": "ville/pays ou null",
  "summary": "résumé professionnel ou null",
  "skills": ["compétences techniques et métier"],
  "softSkills": ["compétences comportementales"],
  "languages": ["langues"],
  "yearsExperience": 3,
  "experiences": [{
    "title": "poste",
    "company": "entreprise",
    "location": "ville ou null",
    "startDate": "date ou null",
    "endDate": "date ou null",
    "current": false,
    "description": "missions principales",
    "skills": ["compétences utilisées"]
  }],
  "education": [{
    "degree": "diplôme",
    "school": "établissement",
    "field": "spécialité ou null",
    "startDate": "date ou null",
    "endDate": "date ou null"
  }],
  "certifications": ["certifications"],
  "sectors": ["secteurs d'activité"],
  "desiredRoles": ["métiers recherchés ou déduits avec prudence"]
}`;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim())
    : [];
}

function normalizeAnalysis(value: unknown): CvAnalysis {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const experiences = Array.isArray(input.experiences) ? input.experiences : [];
  const education = Array.isArray(input.education) ? input.education : [];

  return {
    fullName: asString(input.fullName),
    headline: asString(input.headline),
    email: asString(input.email),
    phone: asString(input.phone),
    location: asString(input.location),
    summary: asString(input.summary),
    skills: asStringArray(input.skills),
    softSkills: asStringArray(input.softSkills),
    languages: asStringArray(input.languages),
    yearsExperience: typeof input.yearsExperience === "number" && input.yearsExperience >= 0 ? Math.round(input.yearsExperience) : null,
    experiences: experiences.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const title = asString(row.title);
      const company = asString(row.company);
      if (!title && !company) return [];
      return [{
        title: title ?? "",
        company: company ?? "",
        location: asString(row.location),
        startDate: asString(row.startDate),
        endDate: asString(row.endDate),
        current: row.current === true,
        description: asString(row.description) ?? "",
        skills: asStringArray(row.skills),
      }];
    }),
    education: education.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const degree = asString(row.degree);
      const school = asString(row.school);
      if (!degree && !school) return [];
      return [{
        degree: degree ?? "",
        school: school ?? "",
        field: asString(row.field),
        startDate: asString(row.startDate),
        endDate: asString(row.endDate),
      }];
    }),
    certifications: asStringArray(input.certifications),
    sectors: asStringArray(input.sectors),
    desiredRoles: asStringArray(input.desiredRoles),
  };
}

function fallbackAnalysis(text: string): CvAnalysis {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.replace(/\s+/g, " ").trim() ?? null;
  const firstLines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  return {
    ...EMPTY_ANALYSIS,
    email,
    phone,
    fullName: firstLines[0] ?? null,
    summary: firstLines.slice(0, 5).join(" ").slice(0, 800) || null,
  };
}

export function analysisToSearchableText(analysis: CvAnalysis): string {
  const lines: string[] = [];
  const add = (label: string, value: string | null) => {
    if (value) lines.push(`${label}: ${value}`);
  };
  const addList = (label: string, values: string[]) => {
    if (values.length > 0) lines.push(`${label}: ${values.join(", ")}`);
  };

  add("Nom", analysis.fullName);
  add("Titre", analysis.headline);
  add("Email", analysis.email);
  add("Téléphone", analysis.phone);
  add("Localisation", analysis.location);
  add("Résumé", analysis.summary);
  addList("Compétences", analysis.skills);
  addList("Compétences comportementales", analysis.softSkills);
  addList("Langues", analysis.languages);
  add("Années d'expérience", analysis.yearsExperience === null ? null : String(analysis.yearsExperience));
  addList("Certifications", analysis.certifications);
  addList("Secteurs", analysis.sectors);
  addList("Métiers recherchés", analysis.desiredRoles);

  for (const experience of analysis.experiences) {
    lines.push(
      [
        `Expérience: ${experience.title}${experience.company ? ` chez ${experience.company}` : ""}`,
        experience.location,
        experience.startDate && experience.endDate
          ? `${experience.startDate} - ${experience.endDate}`
          : experience.startDate,
        experience.description,
        experience.skills.length > 0 ? `Compétences: ${experience.skills.join(", ")}` : null,
      ].filter(Boolean).join(" | "),
    );
  }

  for (const education of analysis.education) {
    lines.push(
      [
        `Formation: ${education.degree}${education.school ? ` — ${education.school}` : ""}`,
        education.field,
        education.startDate && education.endDate
          ? `${education.startDate} - ${education.endDate}`
          : education.startDate,
      ].filter(Boolean).join(" | "),
    );
  }

  return lines.join("\n").trim();
}

async function requestClaudeAnalysis(content: unknown): Promise<CvAnalysis> {
  const baseUrl = process.env["AI_INTEGRATIONS_ANTHROPIC_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"];
  if (!baseUrl || !apiKey) {
    throw new Error("Le service d’analyse IA est indisponible.");
  }

  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error ${response.status}`);
  }

  const data = await response.json() as { content?: { type: string; text?: string }[] };
  const rawText = data.content?.find((block) => block.type === "text")?.text ?? "";
  const json = rawText.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("Claude returned no JSON");
  return normalizeAnalysis(JSON.parse(json));
}

export async function analyzeCvWithClaude(text: string): Promise<CvAnalysis> {
  const baseUrl = process.env["AI_INTEGRATIONS_ANTHROPIC_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"];
  if (!baseUrl || !apiKey) {
    logger.warn("Anthropic env vars missing, using basic CV extraction");
    return fallbackAnalysis(text);
  }

  try {
    return await requestClaudeAnalysis(
      `Voici le texte extrait du CV. Analyse-le sans inventer d'informations :\n\n${text.slice(0, 50000)}`,
    );
  } catch (error) {
    logger.warn({ err: error }, "CV analysis failed, using basic extraction");
    return fallbackAnalysis(text);
  }
}

export async function analyzeCvPdfWithClaude(pdf: Buffer): Promise<CvAnalysis> {
  return requestClaudeAnalysis([
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: pdf.toString("base64"),
      },
    },
    {
      type: "text",
      text: "Analyse directement ce CV PDF, y compris son contenu visuel s’il s’agit d’un scan. N’invente aucune information.",
    },
  ]);
}