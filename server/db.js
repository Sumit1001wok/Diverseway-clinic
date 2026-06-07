"use strict";

const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const bookingsPath = path.join(dataDir, "bookings.json");
const messagesPath = path.join(dataDir, "messages.json");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readJson(filePath) {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

function writeJson(filePath, rows) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), "utf8");
}

function nextId(rows) {
  if (rows.length === 0) {
    return 1;
  }
  return Math.max(...rows.map((row) => Number(row.id) || 0)) + 1;
}

function nowIso() {
  return new Date().toISOString();
}

function createBooking(payload) {
  const rows = readJson(bookingsPath);
  const row = {
    id: nextId(rows),
    name: payload.name,
    phone: payload.phone,
    service: payload.service,
    preferred_date: payload.preferred_date,
    preferred_time: payload.preferred_time,
    message: payload.message,
    status: "pending",
    created_at: nowIso(),
  };
  rows.unshift(row);
  writeJson(bookingsPath, rows);
  return row;
}

function createContact(payload) {
  const rows = readJson(messagesPath);
  const row = {
    id: nextId(rows),
    name: payload.name,
    email: payload.email,
    subject: payload.subject,
    message: payload.message,
    is_read: 0,
    created_at: nowIso(),
  };
  rows.unshift(row);
  writeJson(messagesPath, rows);
  return row;
}

function listBookings() {
  return readJson(bookingsPath);
}

function listMessages() {
  return readJson(messagesPath);
}

function updateBookingStatus(id, status) {
  const rows = readJson(bookingsPath);
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) {
    return false;
  }
  rows[index].status = status;
  writeJson(bookingsPath, rows);
  return true;
}

function updateMessageRead(id, isRead) {
  const rows = readJson(messagesPath);
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) {
    return false;
  }
  rows[index].is_read = isRead ? 1 : 0;
  writeJson(messagesPath, rows);
  return true;
}

module.exports = {
  createBooking,
  createContact,
  listBookings,
  listMessages,
  updateBookingStatus,
  updateMessageRead,
};
