import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const premiumPaymentsTable = pgTable("premium_payments", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  hub2PaymentLinkId: text("hub2_payment_link_id").notNull().unique(),
  purchaseReference: text("purchase_reference").notNull().unique(),
  plan: text("plan").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  paymentLinkExpiresAt: timestamp("payment_link_expires_at", { withTimezone: true }),
  premiumUntil: timestamp("premium_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PremiumPayment = typeof premiumPaymentsTable.$inferSelect;