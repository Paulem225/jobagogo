import { Router, type IRouter } from "express";
import multer from "multer";
import { desc, eq } from "drizzle-orm";
import { db, cvDocumentsTable, profilesTable } from "@workspace/db";
import mammoth from "mammoth";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  analysisToSearchableText,
  analyzeCvPdfWithClaude,
  analyzeCvWithClaude,
  type CvAnalysis,
} from "../lib/cvAnalyzer";
import { requireAuth, requireNonDemo } from "../middleware/auth";

const router: IRouter = Router();
router.use("/profile", requireAuth);
const execFileAsync = promisify(execFile);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

function analysisJson(value: unknown): CvAnalysis | null {
  return value && typeof value === "object" ? value as CvAnalysis : null;
}

function cvJson(cv: typeof cvDocumentsTable.$inferSelect) {
  return {
    id: cv.id,
    fileName: cv.fileName,
    mimeType: cv.mimeType,
    fileSize: cv.fileSize,
    status: cv.status,
    analysis: analysisJson(cv.analysis),
    errorMessage: cv.errorMessage,
    createdAt: cv.createdAt.toISOString(),
    updatedAt: cv.updatedAt.toISOString(),
  };
}

const MIN_TEXT_LENGTH = 20;
const OCR_MAX_PAGES = 8;

function isUsableText(text: string): boolean {
  if (text.length < MIN_TEXT_LENGTH) return false;
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  return letters / text.length >= 0.3;
}

function isMissingCommand(error: unknown): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT";
}

function commandError(command: string): Error {
  return new Error(
    `Le serveur ne peut pas lire ce PDF pour le moment (${command} indisponible). Réessaie dans quelques instants.`,
  );
}

async function ocrPdf(directory: string, inputPath: string): Promise<string> {
  const { readdir, readFile } = await import("node:fs/promises");

  try {
    await execFileAsync(
      "pdftoppm",
      ["-r", "300", "-gray", "-png", "-l", String(OCR_MAX_PAGES), inputPath, `${directory}/page`],
      { timeout: 60_000, maxBuffer: 4 * 1024 * 1024 },
    );
  } catch (error) {
    if (isMissingCommand(error)) throw commandError("pdftoppm");
    throw error;
  }

  const pages = (await readdir(directory))
    .filter((name) => name.startsWith("page") && name.endsWith(".png"))
    .sort();
  if (pages.length === 0) {
    throw new Error("Impossible de lire les pages de ce PDF scanné. Vérifie que le fichier n'est pas corrompu.");
  }

  const chunks: string[] = [];
  for (const page of pages) {
    const outBase = `${directory}/${page}.ocr`;
    try {
      await execFileAsync(
        "tesseract",
        [`${directory}/${page}`, outBase, "-l", "fra+eng", "--psm", "3"],
        { timeout: 60_000, maxBuffer: 4 * 1024 * 1024 },
      );
    } catch (error) {
      if (isMissingCommand(error)) throw commandError("tesseract");
      throw error;
    }
    chunks.push((await readFile(`${outBase}.txt`, "utf8")).trim());
  }
  return chunks.filter(Boolean).join("\n\n").trim();
}

async function extractText(file: Express.Multer.File): Promise<string> {
  if (file.mimetype === "application/pdf") {
    const directory = await mkdtemp(`${tmpdir()}/jobmatch-cv-`);
    const inputPath = `${directory}/input.pdf`;
    const outputPath = `${directory}/output.txt`;
    try {
      await writeFile(inputPath, file.buffer);
      try {
        await execFileAsync("pdftotext", ["-layout", inputPath, outputPath], {
          timeout: 15_000,
          maxBuffer: 2 * 1024 * 1024,
        });
      } catch (error) {
        if (!isMissingCommand(error)) throw error;
        // Some runtime environments may expose the OCR tools without
        // exposing pdftotext. Continue with OCR instead of rejecting the
        // upload immediately; this also handles scanned PDFs.
      }
      if (await fileExists(outputPath)) {
        const { readFile } = await import("node:fs/promises");
        const selectableText = (await readFile(outputPath, "utf8")).trim();
        if (isUsableText(selectableText)) {
          return selectableText;
        }
      }

      // PDF sans texte sélectionnable (scan ou photo) : étape OCR.
      const ocrText = await ocrPdf(directory, inputPath);
      if (!isUsableText(ocrText)) {
        throw new Error(
          "La qualité du scan est insuffisante pour lire ce CV. Réessaie avec un scan plus net ou un PDF avec du texte sélectionnable.",
        );
      }
      return ocrText;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

async function fileExists(path: string): Promise<boolean> {
  try {
    const { access } = await import("node:fs/promises");
    await access(path);
    return true;
  } catch {
    return false;
  }
}

  if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value.trim();
  }

  return file.buffer.toString("utf8").trim();
}

function unique(values: string[]): string[] {
  return [...new Map(values.filter(Boolean).map((value) => [value.toLowerCase(), value])).values()];
}

async function enrichProfile(profile: typeof profilesTable.$inferSelect, analysis: CvAnalysis) {
  const desiredTitle = profile.title?.trim() || analysis.headline || analysis.desiredRoles[0] || null;
  const experienceYears = profile.experienceYears > 0
    ? profile.experienceYears
    : (analysis.yearsExperience ?? profile.experienceYears);

  await db.update(profilesTable)
    .set({
      title: desiredTitle,
      skills: unique([...profile.skills, ...analysis.skills, ...analysis.softSkills]),
      experienceYears,
      location: profile.location.trim() || analysis.location || profile.location,
      email: profile.email?.trim() || analysis.email,
      phone: profile.phone?.trim() || analysis.phone,
      bio: profile.bio?.trim() || analysis.summary,
      lastJobTitle: profile.lastJobTitle?.trim() || analysis.experiences[0]?.title || null,
    })
    .where(eq(profilesTable.id, profile.id));
}

router.get("/profile/cvs", async (req, res): Promise<void> => {
  const [profile] = await db.select().from(profilesTable)
    .where(eq(profilesTable.id, req.auth!.profileId))
    .limit(1);
  if (!profile) {
    res.status(404).json({ error: "Profil introuvable" });
    return;
  }

  const cvs = await db.select().from(cvDocumentsTable)
    .where(eq(cvDocumentsTable.profileId, profile.id))
    .orderBy(desc(cvDocumentsTable.createdAt));
  res.json(cvs.map(cvJson));
});

router.post("/profile/cvs", requireNonDemo, upload.single("file"), async (req, res): Promise<void> => {
  const [profile] = await db.select().from(profilesTable)
    .where(eq(profilesTable.id, req.auth!.profileId))
    .limit(1);
  if (!profile) {
    res.status(404).json({ error: "Profil introuvable. Crée ton profil avant d'ajouter un CV." });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Aucun fichier CV reçu" });
    return;
  }
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    res.status(400).json({ error: "Format non supporté. Utilise un PDF, DOCX ou fichier texte." });
    return;
  }

  const [cv] = await db.insert(cvDocumentsTable).values({
    profileId: profile.id,
    fileName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size,
    status: "processing",
  }).returning();

  try {
    let extractedText: string;
    let analysis: CvAnalysis;

    try {
      extractedText = await extractText(file);
      if (extractedText.length < 20) {
        throw new Error("Le CV ne contient pas assez de texte lisible, même après lecture automatique.");
      }
      analysis = await analyzeCvWithClaude(extractedText);
    } catch (extractionError) {
      if (file.mimetype !== "application/pdf") throw extractionError;

      req.log.warn(
        { err: extractionError, fileName: file.originalname },
        "PDF text/OCR extraction failed, trying direct PDF analysis",
      );
      analysis = await analyzeCvPdfWithClaude(file.buffer);
      extractedText = analysisToSearchableText(analysis);
      if (extractedText.length < 20) {
        throw new Error("Le CV PDF n'a pas fourni assez d'informations lisibles. Réessaie avec un document plus net.");
      }
    }

    await db.update(cvDocumentsTable).set({
      status: "completed",
      extractedText,
      analysis,
      errorMessage: null,
    }).where(eq(cvDocumentsTable.id, cv.id));
    if (req.query.enrich !== "false") {
      await enrichProfile(profile, analysis);
    }

    const [completed] = await db.select().from(cvDocumentsTable).where(eq(cvDocumentsTable.id, cv.id)).limit(1);
    res.status(201).json(cvJson(completed));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible d'analyser le CV";
    await db.update(cvDocumentsTable).set({
      status: "failed",
      errorMessage: message.slice(0, 500),
    }).where(eq(cvDocumentsTable.id, cv.id));
    res.status(422).json({ error: message, cvId: cv.id });
  }
});

router.post("/profile/cvs/:id/reanalyze", requireNonDemo, async (req, res): Promise<void> => {
  const cvId = Number(req.params.id);
  if (!Number.isInteger(cvId)) {
    res.status(400).json({ error: "Identifiant CV invalide" });
    return;
  }

  const [profile] = await db.select().from(profilesTable)
    .where(eq(profilesTable.id, req.auth!.profileId))
    .limit(1);
  const [cv] = profile
    ? await db.select().from(cvDocumentsTable)
        .where(eq(cvDocumentsTable.id, cvId))
        .limit(1)
    : [];

  if (!profile || !cv || cv.profileId !== profile.id) {
    res.status(404).json({ error: "CV introuvable" });
    return;
  }
  if (!cv.extractedText) {
    res.status(422).json({ error: "Ce CV ne contient pas de texte réutilisable. Importe-le à nouveau." });
    return;
  }

  await db.update(cvDocumentsTable).set({
    status: "processing",
    errorMessage: null,
  }).where(eq(cvDocumentsTable.id, cv.id));

  try {
    const analysis = await analyzeCvWithClaude(cv.extractedText);
    await db.update(cvDocumentsTable).set({
      status: "completed",
      analysis,
      errorMessage: null,
    }).where(eq(cvDocumentsTable.id, cv.id));
    await enrichProfile(profile, analysis);

    const [updated] = await db.select().from(cvDocumentsTable)
      .where(eq(cvDocumentsTable.id, cv.id))
      .limit(1);
    res.json(cvJson(updated));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de réanalyser le CV";
    await db.update(cvDocumentsTable).set({
      status: "failed",
      errorMessage: message.slice(0, 500),
    }).where(eq(cvDocumentsTable.id, cv.id));
    res.status(422).json({ error: message, cvId: cv.id });
  }
});

router.delete("/profile/cvs/:id", requireNonDemo, async (req, res): Promise<void> => {
  const cvId = Number(req.params.id);
  if (!Number.isInteger(cvId)) {
    res.status(400).json({ error: "Identifiant CV invalide" });
    return;
  }

  const [profile] = await db.select().from(profilesTable)
    .where(eq(profilesTable.id, req.auth!.profileId))
    .limit(1);
  if (!profile) {
    res.status(404).json({ error: "Profil introuvable" });
    return;
  }

  const [cv] = await db.select({
    id: cvDocumentsTable.id,
    profileId: cvDocumentsTable.profileId,
  }).from(cvDocumentsTable)
    .where(eq(cvDocumentsTable.id, cvId))
    .limit(1);
  if (!cv || cv.profileId !== profile.id) {
    res.status(404).json({ error: "CV introuvable" });
    return;
  }

  await db.delete(cvDocumentsTable).where(eq(cvDocumentsTable.id, cv.id));
  res.status(204).send();
});

export default router;