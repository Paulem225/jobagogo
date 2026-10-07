import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const errorReportsTable = pgTable("error_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  description: text("description").notNull(),
  photoBase64: text("photo_base64"),
  photoMimeType: text("photo_mime_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ErrorReport = typeof errorReportsTable.$inferSelect;