"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  listBookings,
  getBookingById,
  listMessages,
  updateBooking,
  updateBookingStatus,
  updateMessageRead,
  deleteBooking,
  getDbInfo,
  listAvailabilityForDate,
  addAvailabilitySlot,
  addStandardAvailability,
  setAvailabilitySlot,
  deleteAvailabilitySlot,
  formatTimeLabel,
  formatTimeRangeLabel,
  normalizeTime,
  getServiceDuration,
  listServices,
  createService,
  updateService,
  deleteService,
  listTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  listTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  listBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  listSettings,
  setSetting,
  listScreeningSubmissions,
  updateScreeningSubmissionReviewed,
  deleteScreeningSubmission,
} = require("../db");
const { requireAdmin, hasValidSession, verifyAdminLogin } = require("../middleware/auth");
const { asyncHandler } = require("../asyncHandler");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

router.post("/login", loginLimiter, (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!verifyAdminLogin(username, password)) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  req.session.admin = true;
  req.session.username = username;

  res.json({
    ok: true,
    user: { username },
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not sign out." });
    }

    res.clearCookie("dwc.sid");
    res.json({ ok: true });
  });
});

router.get("/session", (req, res) => {
  if (!hasValidSession(req)) {
    return res.json({ authenticated: false });
  }

  res.json({
    authenticated: true,
    user: { username: req.session.username || "admin" },
  });
});

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

router.use(requireAdmin);

router.get(
  "/bookings",
  asyncHandler(async (req, res) => {
    res.json({
      data: await listBookings({
        status: req.query.status,
        search: req.query.search,
      }),
    });
  })
);

router.get(
  "/bookings/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const booking = await getBookingById(id);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    res.json({ data: booking });
  })
);

router.get(
  "/messages",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listMessages() });
  })
);

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    res.json({ data: await getDbInfo() });
  })
);

router.get(
  "/availability",
  asyncHandler(async (req, res) => {
    const date = String(req.query.date || "").trim();
    const service = String(req.query.service || "").trim();

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "A valid date is required (YYYY-MM-DD)." });
    }

    if (!service) {
      return res.status(400).json({ error: "A service is required." });
    }

    const rawSlots = await listAvailabilityForDate(date, service, { includeUnavailable: true });
    const slots = rawSlots.map((slot) => ({
      id: slot.id,
      date: slot.slot_date,
      time: slot.slot_time,
      service: slot.service,
      label: formatTimeLabel(slot.slot_time),
      is_available: Boolean(slot.is_available && !slot.booking_id),
      is_booked: Boolean(slot.booking_id),
      booking_id: slot.booking_id,
      booking_reference: slot.booking_reference,
      booking_name: slot.booking_name,
      booking_status: slot.booking_status,
      booking_service: slot.booking_service,
      booking_duration_minutes: slot.booking_duration_minutes,
      booking_label:
        slot.booking_service && slot.booking_duration_minutes
          ? formatTimeRangeLabel(slot.slot_time, slot.booking_duration_minutes)
          : null,
    }));

    res.json({ date, service, data: slots });
  })
);

router.post(
  "/availability",
  asyncHandler(async (req, res) => {
    const date = String(req.body.date || "").trim();
    const service = String(req.body.service || "").trim();
    const time = normalizeTime(req.body.time);
    const times = Array.isArray(req.body.times)
      ? req.body.times.map((value) => normalizeTime(value)).filter(Boolean)
      : time
        ? [time]
        : [];

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "A valid date is required (YYYY-MM-DD)." });
    }

    if (!service) {
      return res.status(400).json({ error: "A service is required." });
    }

    if (times.length === 0) {
      return res.status(400).json({ error: "At least one valid time is required." });
    }

    const createdRaw = await Promise.all(times.map((slotTime) => addAvailabilitySlot(date, slotTime, service)));
    const created = createdRaw.filter(Boolean);

    res.status(201).json({
      ok: true,
      data: created.map((slot) => ({
        id: slot.id,
        date: slot.slot_date,
        time: slot.slot_time,
        service: slot.service,
        label: formatTimeLabel(slot.slot_time),
        is_available: Boolean(slot.is_available && !slot.booking_id),
      })),
    });
  })
);

router.post(
  "/availability/standard",
  asyncHandler(async (req, res) => {
    const date = String(req.body.date || "").trim();
    const service = String(req.body.service || "").trim();

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "A valid date is required (YYYY-MM-DD)." });
    }

    if (!service) {
      return res.status(400).json({ error: "A service is required." });
    }

    const created = await addStandardAvailability(date, service);
    const rawSlots = await listAvailabilityForDate(date, service, { includeUnavailable: true });

    res.status(201).json({
      ok: true,
      count: created.length,
      data: rawSlots.map((slot) => ({
        id: slot.id,
        time: slot.slot_time,
        service: slot.service,
        label: formatTimeLabel(slot.slot_time),
        is_available: Boolean(slot.is_available && !slot.booking_id),
        is_booked: Boolean(slot.booking_id),
      })),
    });
  })
);

router.patch(
  "/availability/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const slot = await setAvailabilitySlot(id, {
      is_available: req.body.is_available !== false,
    });

    if (!slot) {
      return res.status(404).json({ error: "Slot not found or already booked." });
    }

    res.json({
      ok: true,
      data: {
        id: slot.id,
        time: slot.slot_time,
        label: formatTimeLabel(slot.slot_time),
        is_available: Boolean(slot.is_available && !slot.booking_id),
      },
    });
  })
);

router.delete(
  "/availability/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (!(await deleteAvailabilitySlot(id))) {
      return res.status(404).json({ error: "Slot not found or already booked." });
    }

    res.json({ ok: true, id });
  })
);

router.patch(
  "/bookings/:id/status",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const status = String(req.body.status || "").trim();

    const allowed = ["pending", "confirmed", "cancelled", "completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const booking = await updateBookingStatus(id, status);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    res.json({ ok: true, data: booking });
  })
);

router.patch(
  "/bookings/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const booking = await updateBooking(id, {
      status: req.body.status,
      confirmed_date: req.body.confirmed_date,
      confirmed_time: req.body.confirmed_time,
      assigned_to: req.body.assigned_to,
      admin_notes: req.body.admin_notes,
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found or invalid data." });
    }

    res.json({ ok: true, data: booking });
  })
);

router.delete(
  "/bookings/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (!(await deleteBooking(id))) {
      return res.status(404).json({ error: "Booking not found." });
    }

    res.json({ ok: true, id });
  })
);

router.patch(
  "/messages/:id/read",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const isRead = req.body.is_read !== false;

    if (!(await updateMessageRead(id, isRead))) {
      return res.status(404).json({ error: "Message not found." });
    }

    res.json({ ok: true, id, is_read: isRead ? 1 : 0 });
  })
);

router.get(
  "/services",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listServices() });
  })
);

router.post(
  "/services",
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Name is required." });
    }
    try {
      const service = await createService({
        ...req.body,
        name,
        slug: slugify(req.body.slug || name),
      });
      res.status(201).json({ ok: true, data: service });
    } catch (err) {
      res.status(400).json({ error: "Could not create service. Slug may already be in use." });
    }
  })
);

router.patch(
  "/services/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    try {
      const payload = { ...req.body };
      if (payload.slug !== undefined) {
        payload.slug = slugify(payload.slug);
      }
      const service = await updateService(id, payload);
      if (!service) {
        return res.status(404).json({ error: "Service not found." });
      }
      res.json({ ok: true, data: service });
    } catch (err) {
      res.status(400).json({ error: "Could not update service. Slug may already be in use." });
    }
  })
);

router.delete(
  "/services/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await deleteService(id))) {
      return res.status(404).json({ error: "Service not found." });
    }
    res.json({ ok: true, id });
  })
);

router.get(
  "/team",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listTeamMembers() });
  })
);

router.post(
  "/team",
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Name is required." });
    }
    const member = await createTeamMember({ ...req.body, name });
    res.status(201).json({ ok: true, data: member });
  })
);

router.patch(
  "/team/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const member = await updateTeamMember(id, req.body);
    if (!member) {
      return res.status(404).json({ error: "Team member not found." });
    }
    res.json({ ok: true, data: member });
  })
);

router.delete(
  "/team/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await deleteTeamMember(id))) {
      return res.status(404).json({ error: "Team member not found." });
    }
    res.json({ ok: true, id });
  })
);

router.get(
  "/testimonials",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listTestimonials() });
  })
);

router.post(
  "/testimonials",
  asyncHandler(async (req, res) => {
    const attribution = String(req.body.attribution || "").trim();
    const quote = String(req.body.quote || "").trim();
    if (!attribution || !quote) {
      return res.status(400).json({ error: "Attribution and quote are required." });
    }
    const testimonial = await createTestimonial({ ...req.body, attribution, quote });
    res.status(201).json({ ok: true, data: testimonial });
  })
);

router.patch(
  "/testimonials/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const testimonial = await updateTestimonial(id, req.body);
    if (!testimonial) {
      return res.status(404).json({ error: "Testimonial not found." });
    }
    res.json({ ok: true, data: testimonial });
  })
);

router.delete(
  "/testimonials/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await deleteTestimonial(id))) {
      return res.status(404).json({ error: "Testimonial not found." });
    }
    res.json({ ok: true, id });
  })
);

router.get(
  "/blog",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listBlogPosts() });
  })
);

router.post(
  "/blog",
  asyncHandler(async (req, res) => {
    const title = String(req.body.title || "").trim();
    if (!title) {
      return res.status(400).json({ error: "Title is required." });
    }
    try {
      const post = await createBlogPost({
        ...req.body,
        title,
        slug: slugify(req.body.slug || title),
      });
      res.status(201).json({ ok: true, data: post });
    } catch (err) {
      res.status(400).json({ error: "Could not create post. Slug may already be in use." });
    }
  })
);

router.patch(
  "/blog/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    try {
      const payload = { ...req.body };
      if (payload.slug !== undefined) {
        payload.slug = slugify(payload.slug);
      }
      const post = await updateBlogPost(id, payload);
      if (!post) {
        return res.status(404).json({ error: "Post not found." });
      }
      res.json({ ok: true, data: post });
    } catch (err) {
      res.status(400).json({ error: "Could not update post. Slug may already be in use." });
    }
  })
);

router.delete(
  "/blog/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await deleteBlogPost(id))) {
      return res.status(404).json({ error: "Post not found." });
    }
    res.json({ ok: true, id });
  })
);

router.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listSettings() });
  })
);

router.patch(
  "/settings/:key",
  asyncHandler(async (req, res) => {
    const key = String(req.params.key || "").trim();
    if (!key) {
      return res.status(400).json({ error: "Setting key is required." });
    }
    const value = await setSetting(key, req.body.value);
    res.json({ ok: true, data: { key, value } });
  })
);

router.get(
  "/screening",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listScreeningSubmissions() });
  })
);

router.patch(
  "/screening/:id/reviewed",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const isReviewed = req.body.is_reviewed !== false;

    if (!(await updateScreeningSubmissionReviewed(id, isReviewed))) {
      return res.status(404).json({ error: "Submission not found." });
    }

    res.json({ ok: true, id, is_reviewed: isReviewed ? 1 : 0 });
  })
);

router.delete(
  "/screening/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!(await deleteScreeningSubmission(id))) {
      return res.status(404).json({ error: "Submission not found." });
    }
    res.json({ ok: true, id });
  })
);

module.exports = router;
