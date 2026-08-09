"use strict";

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const { getDbInfo, getBlogPostBySlug } = require("./db");
const { renderBlogPostPage, renderBlogNotFoundPage } = require("./templates/blogPost");

const apiRoutes = require("./routes/api");
const adminRoutes = require("./routes/admin");
const { productionMiddleware } = require("./middleware/production");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const rootDir = path.join(__dirname, "..");
const isProduction = process.env.NODE_ENV === "production";

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
app.use(
  session({
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

app.get("/", (_req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.use("/api", formLimiter, apiRoutes);
app.use("/api/admin", adminRoutes);

app.get("/blog/:slug", (req, res, next) => {
  const slug = req.params.slug.replace(/\.html$/, "");
  const post = getBlogPostBySlug(slug);

  if (!post || post.status !== "published") {
    return res.status(404).send(renderBlogNotFoundPage());
  }

  const relatedPosts = (post.related_slugs || [])
    .map((relatedSlug) => getBlogPostBySlug(relatedSlug))
    .filter((related) => related && related.status === "published");

  res.send(renderBlogPostPage(post, relatedPosts));
});

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

app.listen(PORT, HOST, () => {
  const siteUrl = process.env.SITE_URL || `http://localhost:${PORT}`;
  const dbInfo = getDbInfo();
  console.log(`Diverse Way Clinic running at ${siteUrl}`);
  console.log(`Database: SQLite at ${dbInfo.path}`);
  if (!isProduction) {
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Admin login: http://localhost:${PORT}/admin`);
  }
});
