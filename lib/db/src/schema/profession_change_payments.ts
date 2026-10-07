import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const professionChangePaymentsTable = pgTable("profession_change_payments", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  hub2PaymentLinkId: text("hub2_payment_link_id").notNull().unique(),
  purchaseReference: text("purchase_reference").notNull().unique(),
  requestedTitle: text("requested_title").notNull(),
  amount: integer("amount").notNull().default(2000),
  status: text("status").notNull().default("pending"),
  paymentLinkExpiresAt: timestamp("payment_link_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ProfessionChangePayment = typeof professionChangePaymentsTable.$inferSelect;