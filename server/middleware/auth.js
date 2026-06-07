"use strict";

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    return res.status(503).json({
      error: "Admin API is not configured. Set ADMIN_API_KEY in environment.",
    });
  }

  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.get("x-admin-key");

  if (!token || token !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

module.exports = { requireAdmin };
