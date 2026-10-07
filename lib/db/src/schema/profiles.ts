import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"),
  skills: text("skills").array().notNull().default([]),
  experienceYears: integer("experience_years").notNull().default(0),
  location: text("location").notNull().default(""),
  remote: boolean("remote").notNull().default(false),
  jobTypes: text("job_types").array().notNull().default([]),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  bio: text("bio"),
  email: text("email").unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  linkedin: text("linkedin"),
  phone: text("phone"),
  diploma: text("diploma"),
  lastJobTitle: text("last_job_title"),
  profilePhoto: text("profile_photo"),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumUntil: timestamp("premium_until", { withTimezone: true }),
  premiumTrialUntil: timestamp("premium_trial_until", { withTimezone: true }),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(false),
  lastProfessionChangeAt: timestamp("last_profession_change_at", { withTimezone: true }),
  deviceSecretHash: text("device_secret_hash"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
