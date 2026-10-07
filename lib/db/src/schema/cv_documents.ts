import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const cvDocumentsTable = pgTable("cv_documents", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  status: text("status").notNull().default("processing"),
  extractedText: text("extracted_text"),
  analysis: jsonb("analysis"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CvDocument = typeof cvDocumentsTable.$inferSelect;