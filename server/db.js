"use strict";

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "clinic.db");
const legacyBookingsPath = path.join(dataDir, "bookings.json");
const legacyMessagesPath = path.join(dataDir, "messages.json");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

ensureDataDir();

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      patient_name TEXT,
      patient_age TEXT,
      visit_type TEXT DEFAULT 'new',
      service TEXT NOT NULL,
      preferred_date TEXT,
      preferred_time TEXT,
      confirmed_date TEXT,
      confirmed_time TEXT,
      assigned_to TEXT,
      admin_notes TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      source TEXT DEFAULT 'website',
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS availability_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_date TEXT NOT NULL,
      slot_time TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      booking_id INTEGER,
      created_at TEXT NOT NULL,
      UNIQUE(slot_date, slot_time),
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
    );
  `);

  migrateBookingColumns();

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(reference);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_availability_date ON availability_slots(slot_date);
  `);
}

function migrateBookingColumns() {
  const columns = [
    ["reference", "TEXT"],
    ["email", "TEXT"],
    ["patient_name", "TEXT"],
    ["patient_age", "TEXT"],
    ["visit_type", "TEXT DEFAULT 'new'"],
    ["confirmed_date", "TEXT"],
    ["confirmed_time", "TEXT"],
    ["assigned_to", "TEXT"],
    ["admin_notes", "TEXT"],
    ["source", "TEXT DEFAULT 'website'"],
    ["updated_at", "TEXT"],
    ["duration_minutes", "INTEGER"],
  ];

  const existing = new Set(
    db.prepare("PRAGMA table_info(bookings)").all().map((col) => col.name)
  );

  columns.forEach(([name, definition]) => {
    if (!existing.has(name)) {
      db.exec(`ALTER TABLE bookings ADD COLUMN ${name} ${definition}`);
    }
  });

  const missingRefs = db
    .prepare("SELECT id, created_at FROM bookings WHERE reference IS NULL OR reference = ''")
    .all();

  if (missingRefs.length > 0) {
    const update = db.prepare("UPDATE bookings SET reference = ? WHERE id = ?");
    missingRefs.forEach((row) => {
      update.run(buildReferenceForDate(new Date(row.created_at), row.id), row.id);
    });
  }

  db.prepare(
    `
    UPDATE bookings
    SET duration_minutes = CASE service
      WHEN 'Speech Therapy' THEN 30
      WHEN 'Occupational Therapy' THEN 45
      WHEN 'Behaviour Therapy' THEN 45
      WHEN 'Voice Therapy' THEN 30
      WHEN 'Special Education Support' THEN 45
      ELSE 45
    END
    WHERE duration_minutes IS NULL
  `
  ).run();
}

function buildReferenceForDate(date, fallbackId) {
  const y = String(date.getFullYear()).slice(2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const prefix = `DWC-${y}${m}${d}`;
  const count = db
    .prepare("SELECT COUNT(*) AS count FROM bookings WHERE reference LIKE ?")
    .get(`${prefix}-%`).count;
  const seq = String(fallbackId || count + 1).padStart(3, "0");
  return `${prefix}-${seq}`;
}

function generateReference() {
  return buildReferenceForDate(new Date());
}

function readLegacyJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const rows = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function migrateLegacyJson() {
  const bookingCount = db.prepare("SELECT COUNT(*) AS count FROM bookings").get().count;
  const messageCount = db.prepare("SELECT COUNT(*) AS count FROM messages").get().count;

  if (bookingCount === 0) {
    const legacyBookings = readLegacyJson(legacyBookingsPath);
    if (legacyBookings.length > 0) {
      const insert = db.prepare(`
        INSERT INTO bookings (
          id, reference, name, phone, email, patient_name, patient_age, visit_type,
          service, preferred_date, preferred_time, message, status, source, created_at
        ) VALUES (
          @id, @reference, @name, @phone, @email, @patient_name, @patient_age, @visit_type,
          @service, @preferred_date, @preferred_time, @message, @status, @source, @created_at
        )
      `);

      const migrate = db.transaction((rows) => {
        rows.forEach((row) => {
          const createdAt = row.created_at || new Date().toISOString();
          insert.run({
            id: row.id,
            reference: row.reference || buildReferenceForDate(new Date(createdAt), row.id),
            name: row.name,
            phone: row.phone,
            email: row.email || null,
            patient_name: row.patient_name || null,
            patient_age: row.patient_age || null,
            visit_type: row.visit_type || "new",
            service: row.service,
            preferred_date: row.preferred_date,
            preferred_time: row.preferred_time,
            message: row.message,
            status: row.status || "pending",
            source: row.source || "website",
            created_at: createdAt,
          });
        });
      });

      migrate(legacyBookings);
      console.log(`Migrated ${legacyBookings.length} booking(s) from JSON to SQLite.`);
    }
  }

  if (messageCount === 0) {
    const legacyMessages = readLegacyJson(legacyMessagesPath);
    if (legacyMessages.length > 0) {
      const insert = db.prepare(`
        INSERT INTO messages (
          id, name, email, subject, message, is_read, created_at
        ) VALUES (
          @id, @name, @email, @subject, @message, @is_read, @created_at
        )
      `);

      const migrate = db.transaction((rows) => {
        rows.forEach((row) => {
          insert.run({
            id: row.id,
            name: row.name,
            email: row.email,
            subject: row.subject,
            message: row.message,
            is_read: row.is_read ? 1 : 0,
            created_at: row.created_at || new Date().toISOString(),
          });
        });
      });

      migrate(legacyMessages);
      console.log(`Migrated ${legacyMessages.length} message(s) from JSON to SQLite.`);
    }
  }

  db.exec(`
    INSERT INTO sqlite_sequence (name, seq)
    SELECT 'bookings', COALESCE((SELECT MAX(id) FROM bookings), 0)
    WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'bookings')
      AND COALESCE((SELECT MAX(id) FROM bookings), 0) > 0;

    INSERT INTO sqlite_sequence (name, seq)
    SELECT 'messages', COALESCE((SELECT MAX(id) FROM messages), 0)
    WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'messages')
      AND COALESCE((SELECT MAX(id) FROM messages), 0) > 0;
  `);

  ["bookings", "messages"].forEach((table) => {
    const maxId =
      db.prepare(`SELECT COALESCE(MAX(id), 0) AS maxId FROM ${table}`).get().maxId || 0;
    if (maxId === 0) {
      return;
    }

    const row = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = ?").get(table);
    if (row) {
      db.prepare("UPDATE sqlite_sequence SET seq = ? WHERE name = ?").run(maxId, table);
    } else {
      db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)").run(table, maxId);
    }
  });
}

initSchema();
migrateLegacyJson();

function nowIso() {
  return new Date().toISOString();
}

function normalizeTime(value) {
  if (!value) {
    return null;
  }

  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatTimeLabel(value) {
  const normalized = normalizeTime(value);
  if (!normalized) {
    return value || "—";
  }

  const [hours, minutes] = normalized.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

const SERVICE_DURATIONS = {
  "Speech Therapy": 30,
  "Occupational Therapy": 45,
  "Behaviour Therapy": 45,
  "Psychological Counselling": 45,
  "Voice Therapy": 30,
  "Special Education Support": 45,
  Other: 45,
};

const DEFAULT_DURATION_MINUTES = 45;
const SLOT_INTERVAL_MINUTES = 15;
const CLINIC_OPEN_MINUTES = 7 * 60;
const CLINIC_CLOSE_MINUTES = 20 * 60;

function getServiceDuration(service) {
  return SERVICE_DURATIONS[service] || DEFAULT_DURATION_MINUTES;
}

function timeToMinutes(value) {
  const normalized = normalizeTime(value);
  if (!normalized) {
    return null;
  }

  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatTimeRangeLabel(startTime, durationMinutes) {
  const startMinutes = timeToMinutes(startTime);
  if (startMinutes === null) {
    return formatTimeLabel(startTime);
  }

  return `${formatTimeLabel(startTime)} – ${formatTimeLabel(minutesToTime(startMinutes + durationMinutes))} (${durationMinutes} min)`;
}

function buildStandardSlotTimes() {
  const times = [];

  for (let minutes = CLINIC_OPEN_MINUTES; minutes < CLINIC_CLOSE_MINUTES; minutes += SLOT_INTERVAL_MINUTES) {
    times.push(minutesToTime(minutes));
  }

  return times;
}

const STANDARD_SLOT_TIMES = buildStandardSlotTimes();

function listAvailabilitySlots(date, { includeUnavailable = false } = {}) {
  let sql = `
    SELECT
      s.*,
      b.reference AS booking_reference,
      b.name AS booking_name,
      b.status AS booking_status,
      b.service AS booking_service,
      b.duration_minutes AS booking_duration_minutes
    FROM availability_slots s
    LEFT JOIN bookings b ON b.id = s.booking_id
    WHERE s.slot_date = ?
  `;

  if (!includeUnavailable) {
    sql += " AND s.is_available = 1 AND s.booking_id IS NULL";
  }

  sql += " ORDER BY s.slot_time ASC";

  return db.prepare(sql).all(date);
}

function listAvailabilityForDate(date, options = {}) {
  return listAvailabilitySlots(date, options);
}

function getActiveBookingsForDate(date) {
  return db
    .prepare(
      `
      SELECT id, preferred_time, duration_minutes, service, status
      FROM bookings
      WHERE preferred_date = ?
        AND preferred_time IS NOT NULL
        AND status IN ('pending', 'confirmed')
    `
    )
    .all(date);
}

function bookingsOverlap(startMinutes, durationMinutes, bookings, excludeBookingId = null) {
  return bookings.some((booking) => {
    if (excludeBookingId && booking.id === excludeBookingId) {
      return false;
    }

    const bookingStart = timeToMinutes(booking.preferred_time);
    const bookingDuration = booking.duration_minutes || getServiceDuration(booking.service);

    if (bookingStart === null) {
      return false;
    }

    return startMinutes < bookingStart + bookingDuration && bookingStart < startMinutes + durationMinutes;
  });
}

function isSlotWindowOpen(date, startMinutes, durationMinutes) {
  for (let minute = startMinutes; minute < startMinutes + durationMinutes; minute += SLOT_INTERVAL_MINUTES) {
    const slot = getAvailabilitySlot(date, minutesToTime(minute));

    if (!slot || !slot.is_available || slot.booking_id) {
      return false;
    }
  }

  return true;
}

function isStartTimeAvailable(date, startTime, durationMinutes, excludeBookingId = null) {
  const startMinutes = timeToMinutes(startTime);
  if (startMinutes === null) {
    return false;
  }

  if (startMinutes < CLINIC_OPEN_MINUTES || startMinutes + durationMinutes > CLINIC_CLOSE_MINUTES) {
    return false;
  }

  if ((startMinutes - CLINIC_OPEN_MINUTES) % SLOT_INTERVAL_MINUTES !== 0) {
    return false;
  }

  const bookings = getActiveBookingsForDate(date);

  if (bookingsOverlap(startMinutes, durationMinutes, bookings, excludeBookingId)) {
    return false;
  }

  return isSlotWindowOpen(date, startMinutes, durationMinutes);
}

function listAvailableStartTimes(date, service) {
  const durationMinutes = getServiceDuration(service);
  const starts = [];

  for (
    let startMinutes = CLINIC_OPEN_MINUTES;
    startMinutes + durationMinutes <= CLINIC_CLOSE_MINUTES;
    startMinutes += SLOT_INTERVAL_MINUTES
  ) {
    const time = minutesToTime(startMinutes);

    if (isStartTimeAvailable(date, time, durationMinutes)) {
      starts.push({
        time,
        label: formatTimeRangeLabel(time, durationMinutes),
        duration_minutes: durationMinutes,
      });
    }
  }

  return starts;
}

function getAvailabilitySlot(date, time) {
  const slotTime = normalizeTime(time);
  if (!date || !slotTime) {
    return null;
  }

  return db
    .prepare("SELECT * FROM availability_slots WHERE slot_date = ? AND slot_time = ?")
    .get(date, slotTime);
}

function addAvailabilitySlot(date, time) {
  const slotTime = normalizeTime(time);
  if (!date || !slotTime) {
    return null;
  }

  const existing = getAvailabilitySlot(date, slotTime);
  if (existing) {
    return existing;
  }

  const result = db
    .prepare(
      `
      INSERT INTO availability_slots (slot_date, slot_time, is_available, created_at)
      VALUES (@slot_date, @slot_time, 1, @created_at)
    `
    )
    .run({
      slot_date: date,
      slot_time: slotTime,
      created_at: nowIso(),
    });

  return db.prepare("SELECT * FROM availability_slots WHERE id = ?").get(result.lastInsertRowid);
}

function addStandardAvailability(date) {
  const created = [];

  STANDARD_SLOT_TIMES.forEach((time) => {
    const slot = addAvailabilitySlot(date, time);
    if (slot) {
      created.push(slot);
    }
  });

  return created;
}

function setAvailabilitySlot(id, payload) {
  const existing = db.prepare("SELECT * FROM availability_slots WHERE id = ?").get(id);
  if (!existing) {
    return null;
  }

  if (existing.booking_id && payload.is_available === 1) {
    return null;
  }

  const isAvailable = payload.is_available === undefined ? existing.is_available : payload.is_available ? 1 : 0;

  db.prepare("UPDATE availability_slots SET is_available = ? WHERE id = ?").run(isAvailable, id);

  return db.prepare("SELECT * FROM availability_slots WHERE id = ?").get(id);
}

function deleteAvailabilitySlot(id) {
  const existing = db.prepare("SELECT * FROM availability_slots WHERE id = ?").get(id);
  if (!existing || existing.booking_id) {
    return false;
  }

  const result = db.prepare("DELETE FROM availability_slots WHERE id = ?").run(id);
  return result.changes > 0;
}

function reserveAvailabilitySlot(date, time, bookingId, durationMinutes) {
  const startMinutes = timeToMinutes(time);
  if (startMinutes === null) {
    return false;
  }

  if (!isStartTimeAvailable(date, time, durationMinutes, bookingId)) {
    return false;
  }

  const update = db.prepare(
    `
    UPDATE availability_slots
    SET is_available = 0, booking_id = ?
    WHERE slot_date = ? AND slot_time = ? AND is_available = 1 AND booking_id IS NULL
  `
  );

  for (let minute = startMinutes; minute < startMinutes + durationMinutes; minute += SLOT_INTERVAL_MINUTES) {
    const result = update.run(bookingId, date, minutesToTime(minute));
    if (result.changes === 0) {
      releaseAvailabilityForBooking(bookingId);
      return false;
    }
  }

  return true;
}

function releaseAvailabilityForBooking(bookingId) {
  db.prepare(
    `
    UPDATE availability_slots
    SET is_available = 1, booking_id = NULL
    WHERE booking_id = ?
  `
  ).run(bookingId);
}

function isSlotBookable(date, time, service) {
  const durationMinutes = getServiceDuration(service);
  return isStartTimeAvailable(date, time, durationMinutes);
}

function createBooking(payload) {
  const createdAt = nowIso();
  const reference = generateReference();
  const preferredDate = payload.preferred_date || null;
  const preferredTime = normalizeTime(payload.preferred_time);
  const durationMinutes = getServiceDuration(payload.service);

  if (preferredDate && preferredTime && !isSlotBookable(preferredDate, preferredTime, payload.service)) {
    const error = new Error("That time slot is no longer available. Please choose another time.");
    error.code = "SLOT_UNAVAILABLE";
    throw error;
  }

  const result = db
    .prepare(
      `
      INSERT INTO bookings (
        reference, name, phone, email, patient_name, patient_age, visit_type,
        service, preferred_date, preferred_time, duration_minutes, message, status, source, created_at, updated_at
      ) VALUES (
        @reference, @name, @phone, @email, @patient_name, @patient_age, @visit_type,
        @service, @preferred_date, @preferred_time, @duration_minutes, @message, 'pending', @source, @created_at, @updated_at
      )
    `
    )
    .run({
      reference,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      patient_name: payload.patient_name,
      patient_age: payload.patient_age,
      visit_type: payload.visit_type || "new",
      service: payload.service,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      duration_minutes: durationMinutes,
      message: payload.message,
      source: payload.source || "website",
      created_at: createdAt,
      updated_at: createdAt,
    });

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(result.lastInsertRowid);

  if (preferredDate && preferredTime) {
    const reserved = reserveAvailabilitySlot(
      preferredDate,
      preferredTime,
      booking.id,
      durationMinutes
    );

    if (!reserved) {
      db.prepare("DELETE FROM bookings WHERE id = ?").run(booking.id);
      const error = new Error("That time slot is no longer available. Please choose another time.");
      error.code = "SLOT_UNAVAILABLE";
      throw error;
    }
  }

  return booking;
}

function createContact(payload) {
  const result = db
    .prepare(
      `
      INSERT INTO messages (name, email, subject, message, is_read, created_at)
      VALUES (@name, @email, @subject, @message, 0, @created_at)
    `
    )
    .run({
      name: payload.name,
      email: payload.email,
      subject: payload.subject,
      message: payload.message,
      created_at: nowIso(),
    });

  return db.prepare("SELECT * FROM messages WHERE id = ?").get(result.lastInsertRowid);
}

function listBookings(filters = {}) {
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const search = filters.search ? String(filters.search).trim() : "";

  let sql = "SELECT * FROM bookings WHERE 1=1";
  const params = {};

  if (status) {
    sql += " AND status = @status";
    params.status = status;
  }

  if (search) {
    sql += `
      AND (
        reference LIKE @search OR name LIKE @search OR phone LIKE @search
        OR patient_name LIKE @search OR service LIKE @search OR email LIKE @search
      )
    `;
    params.search = `%${search}%`;
  }

  sql += " ORDER BY datetime(created_at) DESC, id DESC";

  return db.prepare(sql).all(params);
}

function getBookingById(id) {
  return db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
}

function updateBooking(id, payload) {
  const existing = getBookingById(id);
  if (!existing) {
    return null;
  }

  const allowedStatuses = ["pending", "confirmed", "cancelled", "completed"];
  const status = payload.status !== undefined ? String(payload.status).trim() : existing.status;

  if (!allowedStatuses.includes(status)) {
    return null;
  }

  const updatedAt = nowIso();

  if (status === "cancelled" && existing.status !== "cancelled") {
    releaseAvailabilityForBooking(id);
  }

  const result = db
    .prepare(
      `
      UPDATE bookings SET
        status = @status,
        confirmed_date = @confirmed_date,
        confirmed_time = @confirmed_time,
        assigned_to = @assigned_to,
        admin_notes = @admin_notes,
        updated_at = @updated_at
      WHERE id = @id
    `
    )
    .run({
      id,
      status,
      confirmed_date:
        payload.confirmed_date !== undefined
          ? payload.confirmed_date || null
          : existing.confirmed_date,
      confirmed_time:
        payload.confirmed_time !== undefined
          ? normalizeTime(payload.confirmed_time) || null
          : existing.confirmed_time,
      assigned_to:
        payload.assigned_to !== undefined ? payload.assigned_to || null : existing.assigned_to,
      admin_notes:
        payload.admin_notes !== undefined ? payload.admin_notes || null : existing.admin_notes,
      updated_at: updatedAt,
    });

  if (result.changes === 0) {
    return null;
  }

  return getBookingById(id);
}

function updateBookingStatus(id, status) {
  return updateBooking(id, { status });
}

function deleteBooking(id) {
  releaseAvailabilityForBooking(id);
  const result = db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
  return result.changes > 0;
}

function listMessages() {
  return db.prepare("SELECT * FROM messages ORDER BY datetime(created_at) DESC, id DESC").all();
}

function updateMessageRead(id, isRead) {
  const result = db
    .prepare("UPDATE messages SET is_read = ? WHERE id = ?")
    .run(isRead ? 1 : 0, id);
  return result.changes > 0;
}

function getStats() {
  return {
    bookings: db.prepare("SELECT COUNT(*) AS count FROM bookings").get().count,
    messages: db.prepare("SELECT COUNT(*) AS count FROM messages").get().count,
    pending: db
      .prepare("SELECT COUNT(*) AS count FROM bookings WHERE status = 'pending'")
      .get().count,
    confirmed: db
      .prepare("SELECT COUNT(*) AS count FROM bookings WHERE status = 'confirmed'")
      .get().count,
    unread: db.prepare("SELECT COUNT(*) AS count FROM messages WHERE is_read = 0").get().count,
  };
}

function getDbInfo() {
  return {
    type: "sqlite",
    path: dbPath,
    ...getStats(),
  };
}

module.exports = {
  createBooking,
  createContact,
  listBookings,
  getBookingById,
  listMessages,
  updateBooking,
  updateBookingStatus,
  updateMessageRead,
  deleteBooking,
  getDbInfo,
  listAvailabilityForDate,
  listAvailableStartTimes,
  addAvailabilitySlot,
  addStandardAvailability,
  setAvailabilitySlot,
  deleteAvailabilitySlot,
  formatTimeLabel,
  formatTimeRangeLabel,
  normalizeTime,
  getServiceDuration,
  SERVICE_DURATIONS,
};
