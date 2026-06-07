"use strict";

const express = require("express");
const { createBooking, createContact } = require("../db");

const router = express.Router();

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "diverse-way-clinic-api" });
});

router.post("/booking", (req, res) => {
  const name = trim(req.body.name);
  const phone = trim(req.body.phone);
  const service = trim(req.body.service);
  const preferred_date = trim(req.body.preferred_date) || null;
  const preferred_time = trim(req.body.preferred_time) || null;
  const message = trim(req.body.message) || null;

  if (!name || !phone || !service) {
    return res.status(400).json({
      error: "Name, phone, and service are required.",
    });
  }

  if (phone.length < 7 || phone.length > 20) {
    return res.status(400).json({ error: "Please enter a valid phone number." });
  }

  const row = createBooking({
    name,
    phone,
    service,
    preferred_date,
    preferred_time,
    message,
  });

  res.status(201).json({
    ok: true,
    id: row.id,
    message: "Appointment request received. We will contact you shortly.",
  });
});

router.post("/contact", (req, res) => {
  const name = trim(req.body.name) || null;
  const email = trim(req.body.email) || null;
  const subject = trim(req.body.subject);
  const message = trim(req.body.message);

  if (!subject || !message) {
    return res.status(400).json({
      error: "Subject and message are required.",
    });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const row = createContact({ name, email, subject, message });

  res.status(201).json({
    ok: true,
    id: row.id,
    message: "Message sent successfully. We will get back to you soon.",
  });
});

module.exports = router;
