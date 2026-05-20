import { pgTable, text, integer, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatar: text("avatar"),
  googleId: text("google_id").unique(),
  plan: text("plan").notNull().default("free"), // free | pro
  dodoSubscriptionId: text("dodo_subscription_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  type: text("type").notNull().default("static"), // static | dynamic
  qrType: text("qr_type").notNull().default("url"),
  label: text("label"),
  content: text("content").notNull(),
  styleConfig: text("style_config"),
  shortCode: text("short_code").unique(),
  destinationUrl: text("destination_url"),
  downloads: integer("downloads").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  qrCodeId: integer("qr_code_id").notNull(),
  scannedAt: timestamp("scanned_at").notNull().defaultNow(),
  country: text("country"),
  city: text("city"),
  deviceType: text("device_type"),
  browser: text("browser"),
  referrer: text("referrer"),
});
