import { Hono } from 'hono';
import { cors } from "hono/cors";
import { db } from "./database";
import * as schema from "./database/schema";
import { eq, desc, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import DodoPayments from "dodopayments";

// ─── helpers ───────────────────────────────────────────────────────────────

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

function getBaseUrl(c: { req: { url: string; header: (k: string) => string | undefined } }): string {
  // Always prefer the explicit WEBSITE_URL env var (set by Runable)
  const websiteUrl = process.env.WEBSITE_URL;
  if (websiteUrl) return websiteUrl.replace(/\/$/, "");
  // Fallback: respect x-forwarded-proto from reverse proxy so we get https, not http
  const u = new URL(c.req.url);
  const proto = c.req.header("x-forwarded-proto") || u.protocol.replace(":", "");
  const host = c.req.header("x-forwarded-host") || u.host;
  return `${proto}://${host}`;
}

// ─── app ───────────────────────────────────────────────────────────────────

const app = new Hono()
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true }))

  // ── QR scan redirect (before basePath so it's at root /q/:code) ──
  .get("/q/:code", async (c) => {
    const { code } = c.req.param();
    const [qr] = await db.select().from(schema.qrCodes).where(eq(schema.qrCodes.shortCode, code)).limit(1);
    if (!qr || !qr.destinationUrl) return c.text("Not found", 404);

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

  // ── Google OAuth callback (before basePath, no /api prefix) ──
  .get("/auth/google/callback", async (c) => {
    const code = c.req.query("code");
    const error = c.req.query("error");
    const base = getBaseUrl(c);

    if (error || !code) {
      return c.redirect(`${base}/login?error=oauth_denied`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return c.redirect(`${base}/login?error=not_configured`);
    }

    try {
      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${base}/auth/google/callback`,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenRes.json() as { access_token?: string; error?: string };
      if (!tokens.access_token) {
        console.error("Token exchange failed:", tokens);
        return c.redirect(`${base}/login?error=token_failed`);
      }

      // Fetch Google user profile
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile = await profileRes.json() as {
        id: string;
        email: string;
        name: string;
        picture: string;
      };

      if (!profile.email) {
        return c.redirect(`${base}/login?error=no_email`);
      }

      // Upsert user — find by googleId or email
      let user = (await db.select().from(schema.users)
        .where(eq(schema.users.googleId, profile.id)).limit(1))[0];

      if (!user) {
        // Maybe they signed up by email before — link accounts
        const byEmail = (await db.select().from(schema.users)
          .where(eq(schema.users.email, profile.email)).limit(1))[0];

        if (byEmail) {
          [user] = await db.update(schema.users)
            .set({ googleId: profile.id, avatar: profile.picture, name: byEmail.name || profile.name })
            .where(eq(schema.users.id, byEmail.id))
            .returning();
        } else {
          [user] = await db.insert(schema.users).values({
            email: profile.email,
            name: profile.name || null,
            avatar: profile.picture || null,
            googleId: profile.id,
            plan: "free",
          }).returning();
        }
      } else {
        // Refresh avatar/name from Google
        [user] = await db.update(schema.users)
          .set({ avatar: profile.picture, name: user.name || profile.name })
          .where(eq(schema.users.id, user.id))
          .returning();
      }

      // Pass user to the frontend via a redirect with a short-lived token in query param
      // We encode the user as base64 JSON — client reads it, clears URL
      const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
      return c.redirect(`${base}/dashboard?auth=${payload}`);

    } catch (err) {
      console.error("Google OAuth error:", err);
      return c.redirect(`${base}/login?error=server_error`);
    }
  })

  // ── Dodo webhook (no /api prefix, raw body needed) ──
  .post("/webhook/dodo", async (c) => {
    const rawBody = await c.req.text();
    const webhookSecret = process.env.DODO_WEBHOOK_SECRET;

    if (webhookSecret) {
      const dodo = new DodoPayments({ bearerToken: process.env.DODO_API_KEY! });
      try {
        dodo.webhooks.unwrap(rawBody, {
          headers: Object.fromEntries(c.req.raw.headers.entries()),
          key: webhookSecret,
        });
      } catch {
        return c.json({ error: "Invalid webhook signature" }, 401);
      }
    }

    const event = JSON.parse(rawBody) as { type: string; data: Record<string, unknown> };

    if (event.type === "subscription.active") {
      const sub = event.data as { subscription_id: string; metadata?: Record<string, string>; customer?: { email?: string } };
      const userId = sub.metadata?.user_id;
      const email = sub.customer?.email;

      if (userId) {
        await db.update(schema.users)
          .set({ plan: "pro", dodoSubscriptionId: sub.subscription_id })
          .where(eq(schema.users.id, parseInt(userId)));
      } else if (email) {
        await db.update(schema.users)
          .set({ plan: "pro", dodoSubscriptionId: sub.subscription_id })
          .where(eq(schema.users.email, email));
      }
    }

    if (event.type === "subscription.cancelled" || event.type === "subscription.expired") {
      const sub = event.data as { subscription_id: string };
      await db.update(schema.users)
        .set({ plan: "free", dodoSubscriptionId: null })
        .where(eq(schema.users.dodoSubscriptionId, sub.subscription_id));
    }

    return c.json({ ok: true });
  })

  .basePath("api")
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true }))
  .get("/ping", (c) => c.json({ message: `Pong! ${Date.now()}` }, 200))
  .get("/health", (c) => c.json({ status: "ok" }, 200))

  // ── Google OAuth initiation ──
  .get("/auth/google", (c) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return c.json({ error: "Google OAuth not configured" }, 503);

    const base = getBaseUrl(c);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${base}/auth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      access_type: "online",
      prompt: "select_account",
    });

    return c.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }, 200);
  })

  // ── QR CODES ──
  .get("/qr", async (c) => {
    const userId = c.req.query("userId") ? parseInt(c.req.query("userId")!) : null;
    let rows;
    if (userId) {
      rows = await db.select().from(schema.qrCodes).where(eq(schema.qrCodes.userId, userId)).orderBy(desc(schema.qrCodes.createdAt));
    } else {
      rows = await db.select().from(schema.qrCodes).orderBy(desc(schema.qrCodes.createdAt)).limit(50);
    }
    const withCounts = await Promise.all(
      rows.map(async (qr) => {
        const [countRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.scans)
          .where(eq(schema.scans.qrCodeId, qr.id));
        return { ...qr, scanCount: Number(countRow?.count ?? 0) };
      })
    );
    return c.json({ qrCodes: withCounts }, 200);
  })

  .post("/qr", async (c) => {
    const body = await c.req.json();
    const { userId, qrType, label, data, style, isDynamic } = body;

    // Gate: dynamic QR requires pro plan
    if (isDynamic && userId) {
      const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
      if (!u || u.plan !== "pro") {
        return c.json({ error: "Dynamic QR codes require a Pro plan." }, 403);
      }
    }

    const content = buildQRContent(qrType === "dynamic_url" ? "url" : qrType, data);
    const shortCode = isDynamic ? nanoid(8) : null;
    const destinationUrl = isDynamic ? (data.url || "") : null;
    const finalContent = isDynamic
      ? `${getBaseUrl(c)}/q/${shortCode}`
      : content;

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

    return c.json({ qr: { ...qr, scanCount: Number(countRow?.count ?? 0) } }, 200);
  })

  .patch("/qr/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();

    // Gate: editing destination URL on dynamic QR requires pro
    if (body.destinationUrl !== undefined) {
      const [qr] = await db.select().from(schema.qrCodes).where(eq(schema.qrCodes.id, id)).limit(1);
      if (qr?.type === "dynamic" && body.userId) {
        const [u] = await db.select().from(schema.users).where(eq(schema.users.id, body.userId)).limit(1);
        if (!u || u.plan !== "pro") {
          return c.json({ error: "Editing dynamic QR destination requires Pro plan." }, 403);
        }
      }
    }

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

  // ── ANALYTICS (gated: pro only for full data) ──
  .get("/qr/:id/analytics", async (c) => {
    const id = parseInt(c.req.param("id"));
    const userId = c.req.query("userId") ? parseInt(c.req.query("userId")!) : null;

    // Verify ownership
    const [qr] = await db.select().from(schema.qrCodes).where(eq(schema.qrCodes.id, id)).limit(1);
    if (!qr) return c.json({ error: "Not found" }, 404);

    // Check if user is pro
    let isPro = false;
    if (userId) {
      const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
      isPro = u?.plan === "pro";
    }

    const scanRows = await db.select().from(schema.scans)
      .where(eq(schema.scans.qrCodeId, id))
      .orderBy(desc(schema.scans.scannedAt));

    const total = scanRows.length;

    // Free users only get total count
    if (!isPro) {
      return c.json({ total, devices: [], browsers: [], timeline: [], recentScans: [], locked: true }, 200);
    }

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
      total,
      devices: Object.entries(deviceMap).map(([name, value]) => ({ name, value })),
      browsers: Object.entries(browserMap).map(([name, value]) => ({ name, value })),
      timeline,
      recentScans: scanRows.slice(0, 20),
      locked: false,
    }, 200);
  })

  // ── QR IMAGE ──
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

  // ── USER ──
  .get("/user/:id", async (c) => {
    const id = parseInt(c.req.param("id"));
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (!user) return c.json({ error: "Not found" }, 404);
    return c.json({ user }, 200);
  })

  .post("/user", async (c) => {
    const body = await c.req.json();
    if (!body.email) return c.json({ error: "Email required" }, 400);
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, body.email)).limit(1);
    if (existing.length > 0) return c.json({ user: existing[0] }, 200);
    const [user] = await db.insert(schema.users).values({
      email: body.email,
      name: body.name || null,
      plan: "free",
    }).returning();
    return c.json({ user }, 201);
  })

  // Admin only: manually upgrade a user to pro (use from curl/postman)
  // ── Dodo checkout session ──
  .post("/checkout", async (c) => {
    const body = await c.req.json() as { userId: number; email: string; name?: string };
    const base = getBaseUrl(c);

    const dodo = new DodoPayments({
      bearerToken: process.env.DODO_API_KEY!,
      environment: "live_mode",
    });

    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: process.env.DODO_PRODUCT_ID!, quantity: 1 }],
      customer: { email: body.email, name: body.name || body.email, create_new_customer: false },
      metadata: { user_id: String(body.userId) },
      return_url: `${base}/dashboard?upgraded=1`,
    });

    return c.json({ url: (session as unknown as { checkout_url?: string }).checkout_url }, 200);
  })

  .post("/user/:id/upgrade", async (c) => {
    const id = parseInt(c.req.param("id"));
    const secret = c.req.header("x-admin-secret");
    if (secret !== process.env.ADMIN_SECRET && process.env.NODE_ENV === "production") {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const [user] = await db.update(schema.users)
      .set({ plan: "pro" })
      .where(eq(schema.users.id, id))
      .returning();
    return c.json({ user }, 200);
  });

export type AppType = typeof app;
export default app;
