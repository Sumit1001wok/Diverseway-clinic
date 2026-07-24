"use strict";

const crypto = require("crypto");

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function hasValidSession(req) {
  return Boolean(req.session && req.session.admin === true);
}

function hasValidApiKey(req) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return false;
  }

  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.get("x-admin-key");

  return Boolean(token && safeEqual(token, expected));
}

function requireAdmin(req, res, next) {
  if (hasValidSession(req) || hasValidApiKey(req)) {
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
}

function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_API_KEY;

  return { username, password };
}

function verifyAdminLogin(username, password) {
  const expected = getAdminCredentials();

  if (!expected.password) {
    return false;
  }

  return safeEqual(username, expected.username) && safeEqual(password, expected.password);
}

module.exports = {
  requireAdmin,
  hasValidSession,
  verifyAdminLogin,
  getAdminCredentials,
};
