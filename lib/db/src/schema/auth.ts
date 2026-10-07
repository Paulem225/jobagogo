import { boolean, pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { profilesTable } from "./profiles";

export const authOtpChallengesTable = pgTable("auth_otp_challenges", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authSessionsTable = pgTable("auth_sessions", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  isDemo: boolean("is_demo").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authReviewDemoAttemptsTable = pgTable("auth_review_demo_attempts", {
  id: serial("id").primaryKey(),
  attemptKey: text("attempt_key").notNull().unique(),
  attempts: integer("attempts").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type AuthOtpChallenge = typeof authOtpChallengesTable.$inferSelect;
export type AuthSession = typeof authSessionsTable.$inferSelect;