import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";
import { jobsTable } from "./jobs";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const savedJobsTable = pgTable("saved_jobs", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => profilesTable.id, { onDelete: "cascade" }),
  jobId: integer("job_id").notNull().references(() => jobsTable.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSavedJobSchema = createInsertSchema(savedJobsTable).omit({ id: true, savedAt: true });
export type InsertSavedJob = z.infer<typeof insertSavedJobSchema>;
export type SavedJob = typeof savedJobsTable.$inferSelect;
