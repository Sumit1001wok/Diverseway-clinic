"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const { isConfigured, getReply } = require("../chatbot");
const { asyncHandler } = require("../asyncHandler");

const router = express.Router();

// Mounted on its own before the shared /api + formLimiter mount (see
// index.js) so a real back-and-forth conversation — several requests per
// message exchange — doesn't crowd out the shared budget booking/contact/
// screening forms rely on. Generous enough for a real conversation, bounded
// enough to cap the real per-message API cost from abuse.
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please try again in a few minutes." },
});

router.post(
  "/",
  chatLimiter,
  asyncHandler(async (req, res) => {
    if (!isConfigured()) {
      return res.status(503).json({ error: "Chat isn't available right now — message us on WhatsApp instead." });
    }

    const rawMessages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const messages = rawMessages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 2000) }))
      .filter((m) => m.content.length > 0);

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return res.status(400).json({ error: "A message is required." });
    }

    try {
      const reply = await getReply(messages);
      res.json({ reply });
    } catch (err) {
      console.error("Chat error:", err.message);
      res.status(502).json({ error: "Could not get a response right now. Please try again or message us on WhatsApp." });
    }
  })
);

module.exports = router;
