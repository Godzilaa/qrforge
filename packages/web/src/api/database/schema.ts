import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name"),
  plan: text("plan").notNull().default("free"), // free | pro
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const qrCodes = sqliteTable("qr_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  type: text("type").notNull().default("static"), // static | dynamic
  qrType: text("qr_type").notNull().default("url"), // url | wifi | vcard | text | email | sms
  label: text("label"),
  content: text("content").notNull(), // the actual encoded data
  styleConfig: text("style_config"), // JSON: { fg, bg, cornerStyle, dotStyle }
  shortCode: text("short_code").unique(), // for dynamic QR redirect
  destinationUrl: text("destination_url"), // for dynamic QR
  downloads: integer("downloads").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const scans = sqliteTable("scans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  qrCodeId: integer("qr_code_id").notNull(),
  scannedAt: integer("scanned_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  country: text("country"),
  city: text("city"),
  deviceType: text("device_type"), // mobile | desktop | tablet
  browser: text("browser"),
  referrer: text("referrer"),
});
