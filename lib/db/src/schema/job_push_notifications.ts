import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { jobsTable } from "./jobs";
import { profilesTable } from "./profiles";

export const jobPushNotificationsTable = pgTable(
  "job_push_notifications",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id")
      .notNull()
      .references(() => profilesTable.id, { onDelete: "cascade" }),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobsTable.id, { onDelete: "cascade" }),
    reservedAt: timestamp("reserved_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => ({
    profileJobUnique: uniqueIndex("job_push_notifications_profile_job_unique").on(
      table.profileId,
      table.jobId,
    ),
  }),
);

export const insertJobPushNotificationSchema = createInsertSchema(jobPushNotificationsTable).omit({
  id: true,
  reservedAt: true,
  sentAt: true,
});

export type InsertJobPushNotification = z.infer<typeof insertJobPushNotificationSchema>;
export type JobPushNotification = typeof jobPushNotificationsTable.$inferSelect;