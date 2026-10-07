import { pgTable, serial, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  logoUrl: text("logo_url"),
  description: text("description").notNull(),
  location: text("location").notNull(),
  remote: boolean("remote").notNull().default(false),
  skills: text("skills").array().notNull().default([]),
  jobType: text("job_type").notNull().default("CDI"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  dedupeKey: text("dedupe_key").notNull(),
  country: text("country").notNull(),
  postedAt: text("posted_at"),
  experienceYears: integer("experience_years"),
  sector: text("sector"),
  diplomaRequired: text("diploma_required"),
  scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  dedupeKeyUnique: uniqueIndex("jobs_dedupe_key_unique").on(table.dedupeKey),
}));

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, scrapedAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
