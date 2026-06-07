"use strict";

const express = require("express");
const {
  listBookings,
  listMessages,
  updateBookingStatus,
  updateMessageRead,
} = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAdmin);

router.get("/bookings", (_req, res) => {
  res.json({ data: listBookings() });
});

router.get("/messages", (_req, res) => {
  res.json({ data: listMessages() });
});

router.patch("/bookings/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || "").trim();

  const allowed = ["pending", "confirmed", "cancelled", "completed"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  if (!updateBookingStatus(id, status)) {
    return res.status(404).json({ error: "Booking not found." });
  }

  res.json({ ok: true, id, status });
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
