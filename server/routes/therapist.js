"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  verifyTherapistPassword,
  listBookings,
  getBookingById,
  updateBookingStatus,
  checkInTherapist,
  checkOutTherapist,
  listAttendanceForTherapist,
  createAssessment,
  listAssessmentsForTherapist,
  getAssessmentForTherapist,
  updateAssessment,
  deleteAssessment,
  saveAssessmentReport,
} = require("../db");
const { generateReport, isConfigured: isReportGenerationConfigured } = require("../assessmentReport");
const { requireTherapist, hasValidTherapistSession } = require("../middleware/auth");
const { asyncHandler } = require("../asyncHandler");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

const reportGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many report generation requests. Please try again in a few minutes." },
});

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sessionUser(req) {
  const { id, name, email, service } = req.session.therapist;
  return { id, name, email, service };
}

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const email = trim(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const therapist = await verifyTherapistPassword(email, password);
    if (!therapist) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    req.session.therapist = {
      id: therapist.id,
      name: therapist.name,
      email: therapist.email,
      service: therapist.service,
    };

    res.json({ ok: true, user: sessionUser(req) });
  })
);

router.post("/logout", (req, res) => {
  if (req.session) {
    delete req.session.therapist;
  }
  res.json({ ok: true });
});

router.get("/session", (req, res) => {
  if (!hasValidTherapistSession(req)) {
    return res.json({ authenticated: false });
  }

  res.json({ authenticated: true, user: sessionUser(req) });
});

router.get(
  "/bookings",
  requireTherapist,
  asyncHandler(async (req, res) => {
    res.json({ data: await listBookings({ service: req.session.therapist.service }) });
  })
);

router.patch(
  "/bookings/:id",
  requireTherapist,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const booking = await getBookingById(id);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    if (booking.service !== req.session.therapist.service) {
      return res.status(403).json({ error: "This booking isn't for your service." });
    }

    const status = String(req.body.status || "");
    if (!["completed", "no_show"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'completed' or 'no_show'." });
    }

    const updated = await updateBookingStatus(id, status);
    res.json({ data: updated });
  })
);

router.get(
  "/attendance",
  requireTherapist,
  asyncHandler(async (req, res) => {
    res.json({ data: await listAttendanceForTherapist(req.session.therapist.id) });
  })
);

router.post(
  "/attendance/check-in",
  requireTherapist,
  asyncHandler(async (req, res) => {
    try {
      const record = await checkInTherapist(req.session.therapist.id);
      res.json({ ok: true, data: record });
    } catch (err) {
      if (err.code === "ALREADY_CHECKED_IN") {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }
  })
);

router.post(
  "/attendance/check-out",
  requireTherapist,
  asyncHandler(async (req, res) => {
    try {
      const record = await checkOutTherapist(req.session.therapist.id);
      res.json({ ok: true, data: record });
    } catch (err) {
      if (err.code === "NOT_CHECKED_IN" || err.code === "ALREADY_CHECKED_OUT") {
        return res.status(409).json({ error: err.message });
      }
      throw err;
    }
  })
);

router.get(
  "/assessments",
  requireTherapist,
  asyncHandler(async (req, res) => {
    res.json({ data: await listAssessmentsForTherapist(req.session.therapist.id) });
  })
);

router.get(
  "/assessments/:id",
  requireTherapist,
  asyncHandler(async (req, res) => {
    const record = await getAssessmentForTherapist(Number(req.params.id), req.session.therapist.id);
    if (!record) {
      return res.status(404).json({ error: "Assessment not found." });
    }
    res.json({ data: record });
  })
);

router.post(
  "/assessments",
  requireTherapist,
  asyncHandler(async (req, res) => {
    const clientName = String(req.body.client_name || "").trim();
    if (!clientName) {
      return res.status(400).json({ error: "Client name is required." });
    }
    const record = await createAssessment(req.session.therapist.id, { ...req.body, client_name: clientName });
    res.status(201).json({ ok: true, data: record });
  })
);

router.patch(
  "/assessments/:id",
  requireTherapist,
  asyncHandler(async (req, res) => {
    const clientName = req.body.client_name !== undefined ? String(req.body.client_name).trim() : undefined;
    if (clientName !== undefined && !clientName) {
      return res.status(400).json({ error: "Client name is required." });
    }
    const record = await updateAssessment(Number(req.params.id), req.session.therapist.id, {
      ...req.body,
      ...(clientName !== undefined ? { client_name: clientName } : {}),
    });
    if (!record) {
      return res.status(404).json({ error: "Assessment not found." });
    }
    res.json({ ok: true, data: record });
  })
);

router.delete(
  "/assessments/:id",
  requireTherapist,
  asyncHandler(async (req, res) => {
    const deleted = await deleteAssessment(Number(req.params.id), req.session.therapist.id);
    if (!deleted) {
      return res.status(404).json({ error: "Assessment not found." });
    }
    res.json({ ok: true, id: Number(req.params.id) });
  })
);

router.post(
  "/assessments/:id/generate-report",
  requireTherapist,
  reportGenerationLimiter,
  asyncHandler(async (req, res) => {
    if (!isReportGenerationConfigured()) {
      return res.status(503).json({ error: "Report generation isn't available right now." });
    }

    const assessment = await getAssessmentForTherapist(Number(req.params.id), req.session.therapist.id);
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found." });
    }

    try {
      const report = await generateReport(assessment);
      const updated = await saveAssessmentReport(assessment.id, req.session.therapist.id, report);
      res.json({ ok: true, data: updated });
    } catch (err) {
      console.error("Report generation error:", err.message);
      res.status(502).json({ error: "Could not generate the report right now. Please try again." });
    }
  })
);

router.patch(
  "/assessments/:id/report",
  requireTherapist,
  asyncHandler(async (req, res) => {
    const updated = await saveAssessmentReport(Number(req.params.id), req.session.therapist.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Assessment not found." });
    }
    res.json({ ok: true, data: updated });
  })
);

module.exports = router;
