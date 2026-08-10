"use strict";

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const { RedisStore } = require("connect-redis");
const { createClient } = require("redis");

const { getDbInfo, getBlogPostBySlug, ensureReady } = require("./db");
const { renderBlogPostPage, renderBlogNotFoundPage } = require("./templates/blogPost");
const { asyncHandler } = require("./asyncHandler");

const apiRoutes = require("./routes/api");
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");
const { productionMiddleware } = require("./middleware/production");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const rootDir = path.join(__dirname, "..");
const isProduction = process.env.NODE_ENV === "production";
// Vercel sets this automatically on every serverless invocation.
const isServerless = Boolean(process.env.VERCEL);

productionMiddleware(app);

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "32kb" }));

// Sessions live in Redis (Vercel KV or any Redis-compatible store) so admin/
// patient logins survive across the stateless, short-lived serverless
// function instances Vercel runs this app as. Falls back to express-session's
// in-memory store for local dev when no Redis URL is configured — fine for a
// single long-running local process, but NOT safe for serverless, where every
// invocation could be a different instance with its own memory.
const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
let sessionStore;

if (redisUrl) {
  const redisClient = createClient({ url: redisUrl });
  redisClient.on("error", (err) => console.error("Redis client error:", err.message));
  redisClient.connect().catch((err) => console.error("Redis connection failed:", err.message));
  sessionStore = new RedisStore({ client: redisClient, prefix: "dwc-sess:" });
} else if (isServerless) {
  console.error(
    "WARNING: no REDIS_URL/KV_URL set while running on Vercel — sessions will not persist reliably across requests. Set up Vercel KV and add its connection string."
  );
}

app.use(
  session({
    store: sessionStore,
    name: "dwc.sid",
    secret: process.env.SESSION_SECRET || process.env.ADMIN_API_KEY || "dev-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Generous general-purpose limiter for the authenticated admin/patient API
// surfaces. Higher ceiling than formLimiter so routine dashboard use (session
// polling, list refreshes) never trips it, but every endpoint still has *some*
// bound — including admin routes that also accept an ADMIN_API_KEY header, so
// that key can't be brute-forced without limit. Login/register endpoints keep
// their own tighter loginLimiter/authLimiter on top of this.
const authedApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

// Mounted before the generic "/api" prefix below so their own requests never
// pass through formLimiter's shared 30-req/15-min bucket — /api/auth/session
// in particular is polled on every public page load and would otherwise
// starve real form submissions of their share of that budget. They get their
// own, more generous authedApiLimiter instead of no limit at all.
app.use("/api/admin", authedApiLimiter, adminRoutes);
app.use("/api/auth", authedApiLimiter, authRoutes);
app.use("/api", formLimiter, apiRoutes);

app.get(
  "/blog/:slug",
  asyncHandler(async (req, res) => {
    const slug = req.params.slug.replace(/\.html$/, "");
    const post = await getBlogPostBySlug(slug);

    if (!post || post.status !== "published") {
      return res.status(404).send(renderBlogNotFoundPage());
    }

    const relatedPosts = (
      await Promise.all((post.related_slugs || []).map((relatedSlug) => getBlogPostBySlug(relatedSlug)))
    ).filter((related) => related && related.status === "published");

    res.send(renderBlogPostPage(post, relatedPosts));
  })
);

app.use(express.static(rootDir, { index: false }));

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(rootDir, "admin", "index.html"));
});

app.get("/admin/login", (_req, res) => {
  res.sendFile(path.join(rootDir, "admin", "index.html"));
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || path.extname(req.path)) {
    return next();
  }
  res.sendFile(path.join(rootDir, "index.html"));
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

if (!isServerless) {
  ensureReady()
    .then(() => getDbInfo())
    .then((dbInfo) => {
      app.listen(PORT, HOST, () => {
        const siteUrl = process.env.SITE_URL || `http://localhost:${PORT}`;
        console.log(`Diverse Way Clinic running at ${siteUrl}`);
        console.log(`Database: ${dbInfo.type}`);
        if (!isProduction) {
          console.log(`Local: http://localhost:${PORT}`);
          console.log(`Admin login: http://localhost:${PORT}/admin`);
        }
      });
    })
    .catch((err) => {
      console.error("Failed to start server:", err);
      process.exit(1);
    });
}

module.exports = app;
