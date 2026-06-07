"use strict";

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

require("./db");

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
app.use(cors());
app.use(express.json({ limit: "32kb" }));

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

app.use(express.static(rootDir, { index: false }));

app.get("/admin", (_req, res) => {
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
  console.log(`Diverse Way Clinic running at ${siteUrl}`);
  if (!isProduction) {
    console.log(`Local: http://localhost:${PORT}`);
  }
});
