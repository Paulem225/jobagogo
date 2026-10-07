import { Router, type IRouter } from "express";
import multer from "multer";
import { db, errorReportsTable } from "@workspace/db";
import { requireAuth, requireNonDemo } from "../middleware/auth";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/error-reports", requireAuth, requireNonDemo, upload.single("photo"), async (req, res): Promise<void> => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";

  if (!name || !phone || !description) {
    res.status(400).json({ error: "Le nom, le téléphone et la description sont obligatoires." });
    return;
  }

  if (name.length > 120 || phone.length > 40 || description.length > 5000) {
    res.status(400).json({ error: "Le signalement dépasse la longueur autorisée." });
    return;
  }

  if (req.file && !req.file.mimetype.startsWith("image/")) {
    res.status(400).json({ error: "La pièce jointe doit être une image." });
    return;
  }

  const [report] = await db.insert(errorReportsTable).values({
    name,
    phone,
    description,
    photoBase64: req.file ? req.file.buffer.toString("base64") : null,
    photoMimeType: req.file?.mimetype ?? null,
  }).returning({
    id: errorReportsTable.id,
    name: errorReportsTable.name,
    phone: errorReportsTable.phone,
    description: errorReportsTable.description,
    createdAt: errorReportsTable.createdAt,
  });

  res.status(201).json({
    ...report,
    hasPhoto: Boolean(req.file),
    createdAt: report.createdAt.toISOString(),
  });
});

export default router;