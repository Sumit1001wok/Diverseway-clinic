"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  createPatient,
  getPatientByEmail,
  verifyPatientPassword,
  listBookingsForPatient,
  listScreeningSubmissionsForPatient,
} = require("../db");
const { requirePatient, hasValidPatientSession } = require("../middleware/auth");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sessionUser(req) {
  const { id, name, email, phone } = req.session.patient;
  return { id, name, email, phone: phone || null };
}

router.post("/register", authLimiter, (req, res) => {
  const name = trim(req.body.name);
  const email = trim(req.body.email);
  const phone = trim(req.body.phone);
  const password = String(req.body.password || "");

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  if (getPatientByEmail(email)) {
    return res.status(409).json({ error: "An account with this email already exists. Try signing in instead." });
  }

  const patient = createPatient({ name, email, phone: phone || null, password });

  req.session.patient = { id: patient.id, name: patient.name, email: patient.email, phone: patient.phone };

  res.status(201).json({ ok: true, user: sessionUser(req) });
});

router.post("/login", authLimiter, (req, res) => {
  const email = trim(req.body.email);
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const patient = verifyPatientPassword(email, password);
  if (!patient) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  req.session.patient = { id: patient.id, name: patient.name, email: patient.email, phone: patient.phone };

  res.json({ ok: true, user: sessionUser(req) });
});

router.post("/logout", (req, res) => {
  if (req.session) {
    delete req.session.patient;
  }
  res.json({ ok: true });
});

router.get("/session", (req, res) => {
  if (!hasValidPatientSession(req)) {
    return res.json({ authenticated: false });
  }

  res.json({ authenticated: true, user: sessionUser(req) });
});

router.get("/account/bookings", requirePatient, (req, res) => {
  res.json({ data: listBookingsForPatient(req.session.patient.id) });
});

router.get("/account/screenings", requirePatient, (req, res) => {
  res.json({ data: listScreeningSubmissionsForPatient(req.session.patient.id) });
});

module.exports = router;
