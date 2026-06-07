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

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const rootDir = path.join(__dirname, "..");

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

app.use("/api", formLimiter, apiRoutes);
app.use("/api/admin", adminRoutes);

app.use(express.static(rootDir));

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(rootDir, "admin", "index.html"));
});

app.use((_req, res) => {
  res.status(404).sendFile(path.join(rootDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Diverse Way Clinic running at http://localhost:${PORT}`);
});
