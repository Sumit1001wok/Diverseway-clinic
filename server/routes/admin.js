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
} = require("../db");
const { requireAdmin, hasValidSession, verifyAdminLogin } = require("../middleware/auth");

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

router.use(requireAdmin);

router.get("/bookings", (req, res) => {
  res.json({
    data: listBookings({
      status: req.query.status,
      search: req.query.search,
    }),
  });
});

router.get("/bookings/:id", (req, res) => {
  const id = Number(req.params.id);
  const booking = getBookingById(id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found." });
  }

  res.json({ data: booking });
});

router.get("/messages", (_req, res) => {
  res.json({ data: listMessages() });
});

router.get("/stats", (_req, res) => {
  res.json({ data: getDbInfo() });
});

router.get("/availability", (req, res) => {
  const date = String(req.query.date || "").trim();

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "A valid date is required (YYYY-MM-DD)." });
  }

  const slots = listAvailabilityForDate(date, { includeUnavailable: true }).map((slot) => ({
    id: slot.id,
    date: slot.slot_date,
    time: slot.slot_time,
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

  res.json({ date, data: slots });
});

router.post("/availability", (req, res) => {
  const date = String(req.body.date || "").trim();
  const time = normalizeTime(req.body.time);
  const times = Array.isArray(req.body.times)
    ? req.body.times.map((value) => normalizeTime(value)).filter(Boolean)
    : time
      ? [time]
      : [];

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "A valid date is required (YYYY-MM-DD)." });
  }

  if (times.length === 0) {
    return res.status(400).json({ error: "At least one valid time is required." });
  }

  const created = times.map((slotTime) => addAvailabilitySlot(date, slotTime)).filter(Boolean);

  res.status(201).json({
    ok: true,
    data: created.map((slot) => ({
      id: slot.id,
      date: slot.slot_date,
      time: slot.slot_time,
      label: formatTimeLabel(slot.slot_time),
      is_available: Boolean(slot.is_available && !slot.booking_id),
    })),
  });
});

router.post("/availability/standard", (req, res) => {
  const date = String(req.body.date || "").trim();

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "A valid date is required (YYYY-MM-DD)." });
  }

  const created = addStandardAvailability(date);

  res.status(201).json({
    ok: true,
    count: created.length,
    data: listAvailabilityForDate(date, { includeUnavailable: true }).map((slot) => ({
      id: slot.id,
      time: slot.slot_time,
      label: formatTimeLabel(slot.slot_time),
      is_available: Boolean(slot.is_available && !slot.booking_id),
      is_booked: Boolean(slot.booking_id),
    })),
  });
});

router.patch("/availability/:id", (req, res) => {
  const id = Number(req.params.id);
  const slot = setAvailabilitySlot(id, {
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
});

router.delete("/availability/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!deleteAvailabilitySlot(id)) {
    return res.status(404).json({ error: "Slot not found or already booked." });
  }

  res.json({ ok: true, id });
});

router.patch("/bookings/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || "").trim();

  const allowed = ["pending", "confirmed", "cancelled", "completed"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const booking = updateBookingStatus(id, status);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found." });
  }

  res.json({ ok: true, data: booking });
});

router.patch("/bookings/:id", (req, res) => {
  const id = Number(req.params.id);
  const booking = updateBooking(id, {
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
});

router.delete("/bookings/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!deleteBooking(id)) {
    return res.status(404).json({ error: "Booking not found." });
  }

  res.json({ ok: true, id });
});

router.patch("/messages/:id/read", (req, res) => {
  const id = Number(req.params.id);
  const isRead = req.body.is_read !== false;

  if (!updateMessageRead(id, isRead)) {
    return res.status(404).json({ error: "Message not found." });
  }

  res.json({ ok: true, id, is_read: isRead ? 1 : 0 });
});

module.exports = router;
