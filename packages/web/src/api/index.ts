import { Hono } from 'hono';
import { cors } from "hono/cors";
import { db } from "./database";
import * as schema from "./database/schema";
import { eq, desc, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { nanoid } from "nanoid";

function buildQRContent(qrType: string, data: Record<string, string>): string {
  switch (qrType) {
    case "url":
      return data.url || "";
    case "wifi":
      return `WIFI:T:${data.encryption || "WPA"};S:${data.ssid || ""};P:${data.password || ""};;`;
    case "vcard":
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${data.name || ""}\nTEL:${data.phone || ""}\nEMAIL:${data.email || ""}\nORG:${data.company || ""}\nURL:${data.website || ""}\nEND:VCARD`;
    case "text":
      return data.text || "";
    case "email":
      return `mailto:${data.email || ""}?subject=${encodeURIComponent(data.subject || "")}&body=${encodeURIComponent(data.body || "")}`;
    case "sms":
      return `sms:${data.phone || ""}?body=${encodeURIComponent(data.message || "")}`;
    default:
      return data.url || "";
  }
}

function detectDevice(ua: string): string {
  if (/mobile|android|iphone|ipad/i.test(ua)) return "mobile";
  if (/tablet/i.test(ua)) return "tablet";
  return "desktop";
}

function detectBrowser(ua: string): string {
  if (/chrome/i.test(ua) && !/edg|opr/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/edg/i.test(ua)) return "Edge";
  return "Other";
}

const app = new Hono()
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true, exposeHeaders: ["set-auth-token"] }))

  // === QR Redirect (scan tracking) ===
  .get("/q/:code", async (c) => {
    const { code } = c.req.param();
    const [qr] = await db.select().from(schema.qrCodes).where(eq(schema.qrCodes.shortCode, code)).limit(1);
    if (!qr || !qr.destinationUrl) return c.text("Not found", 404);

    // log scan
    const ua = c.req.header("user-agent") || "";
    await db.insert(schema.scans).values({
      qrCodeId: qr.id,
      deviceType: detectDevice(ua),
      browser: detectBrowser(ua),
      referrer: c.req.header("referer") || null,
      country: null,
      city: null,
    });

    return c.redirect(qr.destinationUrl, 302);
  })

  .basePath("api")
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true, exposeHeaders: ["set-auth-token"] }))
  .get("/ping", (c) => c.json({ message: `Pong! ${Date.now()}` }, 200))
  .get("/health", (c) => c.json({ status: "ok" }, 200))

  // === QR CODES ===
  .get("/qr", async (c) => {
    const userId = c.req.query("userId") ? parseInt(c.req.query("userId")!) : null;
    let rows;
    if (userId) {
      rows = await db.select().from(schema.qrCodes).where(eq(schema.qrCodes.userId, userId)).orderBy(desc(schema.qrCodes.createdAt));
    } else {
      rows = await db.select().from(schema.qrCodes).orderBy(desc(schema.qrCodes.createdAt)).limit(50);
    }
    // attach scan counts
    const withCounts = await Promise.all(
      rows.map(async (qr) => {
        const [countRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.scans)
          .where(eq(schema.scans.qrCodeId, qr.id));
        return { ...qr, scanCount: countRow?.count ?? 0 };
      })
    );
    return c.json({ qrCodes: withCounts }, 200);
  })

  .post("/qr", async (c) => {
    const body = await c.req.json();
    const { userId, qrType, label, data, style, isDynamic } = body;

    const content = qrType === "dynamic_url"
      ? "" // will be set after insert
      : buildQRContent(qrType, data);

    const shortCode = isDynamic ? nanoid(8) : null;
    const destinationUrl = isDynamic ? (data.url || "") : null;
    const finalContent = isDynamic ? `${c.req.url.split("/api")[0]}/q/${shortCode}` : content;

    const [qr] = await db.insert(schema.qrCodes).values({
      userId: userId || null,
      type: isDynamic ? "dynamic" : "static",
      qrType: qrType === "dynamic_url" ? "url" : qrType,
      label: label || null,
      content: finalContent,
      styleConfig: style ? JSON.stringify(style) : null,
      shortCode,
      destinationUrl,
    }).returning();

    return c.json({ qr }, 201);
  })

  .get("/qr/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const [qr] = await db.select().from(schema.qrCodes).where(eq(schema.qrCodes.id, id)).limit(1);
    if (!qr) return c.json({ error: "Not found" }, 404);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.scans)
      .where(eq(schema.scans.qrCodeId, id));

    return c.json({ qr: { ...qr, scanCount: countRow?.count ?? 0 } }, 200);
  })

  .patch("/qr/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [qr] = await db.update(schema.qrCodes)
      .set({ destinationUrl: body.destinationUrl, label: body.label })
      .where(eq(schema.qrCodes.id, id))
      .returning();
    return c.json({ qr }, 200);
  })

  .delete("/qr/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.scans).where(eq(schema.scans.qrCodeId, id));
    await db.delete(schema.qrCodes).where(eq(schema.qrCodes.id, id));
    return c.json({ ok: true }, 200);
  })

  // === ANALYTICS ===
  .get("/qr/:id/analytics", async (c) => {
    const id = parseInt(c.req.param("id"));
    const scanRows = await db.select().from(schema.scans)
      .where(eq(schema.scans.qrCodeId, id))
      .orderBy(desc(schema.scans.scannedAt));

    // Device breakdown
    const deviceMap: Record<string, number> = {};
    const browserMap: Record<string, number> = {};
    const dayMap: Record<string, number> = {};

    for (const s of scanRows) {
      if (s.deviceType) deviceMap[s.deviceType] = (deviceMap[s.deviceType] || 0) + 1;
      if (s.browser) browserMap[s.browser] = (browserMap[s.browser] || 0) + 1;
      if (s.scannedAt) {
        const day = new Date(s.scannedAt).toISOString().slice(0, 10);
        dayMap[day] = (dayMap[day] || 0) + 1;
      }
    }

    const timeline = Object.entries(dayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    return c.json({
      total: scanRows.length,
      devices: Object.entries(deviceMap).map(([name, value]) => ({ name, value })),
      browsers: Object.entries(browserMap).map(([name, value]) => ({ name, value })),
      timeline,
      recentScans: scanRows.slice(0, 20),
    }, 200);
  })

  // === QR IMAGE GENERATION ===
  .get("/qr/:id/image", async (c) => {
    const id = parseInt(c.req.param("id"));
    const fmt = c.req.query("format") || "png";
    const [qr] = await db.select().from(schema.qrCodes).where(eq(schema.qrCodes.id, id)).limit(1);
    if (!qr) return c.json({ error: "Not found" }, 404);

    const style = qr.styleConfig ? JSON.parse(qr.styleConfig) : {};
    const options: QRCode.QRCodeToBufferOptions = {
      type: "png",
      width: 512,
      margin: 2,
      color: {
        dark: style.fg || "#00FF41",
        light: style.bg || "#000000",
      },
    };

    if (fmt === "svg") {
      const svg = await QRCode.toString(qr.content, { type: "svg", ...options });
      c.header("Content-Type", "image/svg+xml");
      return c.body(svg);
    }

    const buf = await QRCode.toBuffer(qr.content, options);
    c.header("Content-Type", "image/png");
    c.header("Content-Disposition", `attachment; filename="qr-${id}.png"`);
    return c.body(buf);
  })

  // === USER PLAN (simple, no auth for MVP) ===
  .get("/user/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (!user) return c.json({ error: "Not found" }, 404);
    return c.json({ user }, 200);
  })

  .post("/user", async (c) => {
    const body = await c.req.json();
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, body.email)).limit(1);
    if (existing.length > 0) return c.json({ user: existing[0] }, 200);
    const [user] = await db.insert(schema.users).values({
      email: body.email,
      name: body.name || null,
      plan: "free",
    }).returning();
    return c.json({ user }, 201);
  });

export type AppType = typeof app;
export default app;
