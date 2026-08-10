"use strict";

const express = require("express");
const {
  createBooking,
  createContact,
  getDbInfo,
  listAvailableStartTimes,
  getServiceDuration,
  listServices,
  listTeamMembers,
  listTestimonials,
  listBlogPosts,
  listSettings,
  createScreeningSubmission,
  updateScreeningSubmissionContact,
} = require("../db");
const { notifyNewBooking, notifyNewContact, notifyScreeningCallback } = require("../whatsapp");
const { asyncHandler } = require("../asyncHandler");

const router = express.Router();

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

router.get(
  "/health",
  asyncHandler(async (_req, res) => {
    res.json({
      ok: true,
      service: "diverse-way-clinic-api",
      database: await getDbInfo(),
    });
  })
);

router.get(
  "/services",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listServices({ activeOnly: true }) });
  })
);

router.get(
  "/team",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listTeamMembers({ activeOnly: true }) });
  })
);

router.get(
  "/testimonials",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listTestimonials({ activeOnly: true }) });
  })
);

router.get(
  "/blog",
  asyncHandler(async (req, res) => {
    const category = trim(req.query.category);
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    res.json({
      data: await listBlogPosts({
        category: category || undefined,
        publishedOnly: true,
        limit: Number.isFinite(limit) ? limit : undefined,
      }),
    });
  })
);

router.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listSettings() });
  })
);

router.get(
  "/availability",
  asyncHandler(async (req, res) => {
    const date = trim(req.query.date);
    const service = trim(req.query.service);

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "A valid date is required (YYYY-MM-DD)." });
    }

    if (!service) {
      return res.status(400).json({ error: "Please select a service to view available times." });
    }

    const durationMinutes = getServiceDuration(service);
    const slots = await listAvailableStartTimes(date, service);

    res.json({ date, service, duration_minutes: durationMinutes, data: slots });
  })
);

router.post(
  "/booking",
  asyncHandler(async (req, res) => {
    const name = trim(req.body.name);
    const phone = trim(req.body.phone);
    const email = trim(req.body.email) || null;
    const patient_name = trim(req.body.patient_name) || null;
    const patient_age = trim(req.body.patient_age) || null;
    const visit_type = trim(req.body.visit_type) || "new";
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

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const allowedVisitTypes = ["new", "follow_up"];
    if (!allowedVisitTypes.includes(visit_type)) {
      return res.status(400).json({ error: "Invalid visit type." });
    }

    try {
      const row = await createBooking({
        name,
        phone,
        email,
        patient_name,
        patient_age,
        visit_type,
        service,
        preferred_date,
        preferred_time,
        message,
        source: "website",
        patient_id: req.session?.patient?.id || null,
      });

      notifyNewBooking(row);

      res.status(201).json({
        ok: true,
        id: row.id,
        reference: row.reference,
        message: `Appointment request received. Reference: ${row.reference}. We will contact you shortly.`,
      });
    } catch (err) {
      if (err.code === "SLOT_UNAVAILABLE") {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }
  })
);

router.post(
  "/screening",
  asyncHandler(async (req, res) => {
    const category = trim(req.body.category);
    const categoryLabel = trim(req.body.category_label) || null;
    const ageBand = trim(req.body.age_band) || null;
    const conclusion = trim(req.body.conclusion);
    const notes = trim(req.body.notes) || null;
    const answers = req.body.answers && typeof req.body.answers === "object" ? req.body.answers : {};
    const contactName = trim(req.body.contact_name) || null;
    const contactPhone = trim(req.body.contact_phone) || null;
    const contactEmail = trim(req.body.contact_email) || null;

    if (!category || !conclusion) {
      return res.status(400).json({ error: "Category and conclusion are required." });
    }

    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const row = await createScreeningSubmission({
      category,
      category_label: categoryLabel,
      age_band: ageBand,
      answers,
      notes,
      conclusion,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      patient_id: req.session?.patient?.id || null,
    });

    res.status(201).json({ ok: true, id: row.id });
  })
);

router.patch(
  "/screening/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid screening id." });
    }

    const contactName = trim(req.body.contact_name) || null;
    const contactPhone = trim(req.body.contact_phone) || null;
    const contactEmail = trim(req.body.contact_email) || null;

    if (!contactName || !contactPhone) {
      return res.status(400).json({ error: "Name and phone are required." });
    }

    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const row = await updateScreeningSubmissionContact(id, {
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
    });

    if (!row) {
      return res.status(404).json({ error: "Screening not found." });
    }

    notifyScreeningCallback(row);

    res.json({ ok: true, id: row.id });
  })
);

router.post(
  "/contact",
  asyncHandler(async (req, res) => {
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

    const row = await createContact({ name, email, subject, message });

    notifyNewContact(row);

    res.status(201).json({
      ok: true,
      id: row.id,
      message: "Message sent successfully. We will get back to you soon.",
    });
  })
);

module.exports = router;
