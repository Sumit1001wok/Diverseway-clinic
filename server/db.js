"use strict";

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const { SERVICES, TEAM_MEMBERS, TESTIMONIALS, BLOG_POSTS, SETTINGS } = require("./seedContent");

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

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      short_description TEXT,
      description TEXT,
      icon_path TEXT,
      detail_icon_path TEXT,
      photo_url TEXT,
      accent_class TEXT,
      treat_list TEXT,
      whatsapp_message TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT,
      bio TEXT,
      bio_short TEXT,
      photo_url TEXT,
      whatsapp_message TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attribution TEXT NOT NULL,
      quote TEXT NOT NULL,
      avatar_url TEXT,
      stars INTEGER NOT NULL DEFAULT 5,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT,
      category TEXT,
      category_label TEXT,
      tag_class TEXT,
      hero_image_url TEXT,
      hero_image_alt TEXT,
      body_html TEXT,
      meta_description TEXT,
      keywords TEXT,
      read_time TEXT,
      published_at TEXT,
      updated_at TEXT,
      is_featured INTEGER NOT NULL DEFAULT 0,
      related_slugs TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      whatsapp_cta_heading TEXT,
      whatsapp_cta_text TEXT,
      whatsapp_cta_message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS screening_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      category_label TEXT,
      age_band TEXT,
      answers TEXT NOT NULL,
      notes TEXT,
      conclusion TEXT NOT NULL,
      contact_name TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      is_reviewed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
  `);

  migrateBookingColumns();
  migratePatientIdColumns();

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(reference);
    CREATE INDEX IF NOT EXISTS idx_bookings_patient ON bookings(patient_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_availability_date ON availability_slots(slot_date);
    CREATE INDEX IF NOT EXISTS idx_services_sort ON services(sort_order);
    CREATE INDEX IF NOT EXISTS idx_team_sort ON team_members(sort_order);
    CREATE INDEX IF NOT EXISTS idx_testimonials_sort ON testimonials(sort_order);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
    CREATE INDEX IF NOT EXISTS idx_screening_created_at ON screening_submissions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_screening_patient ON screening_submissions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
  `);
}

function migratePatientIdColumns() {
  const bookingCols = new Set(db.prepare("PRAGMA table_info(bookings)").all().map((c) => c.name));
  if (!bookingCols.has("patient_id")) {
    db.exec("ALTER TABLE bookings ADD COLUMN patient_id INTEGER REFERENCES patients(id)");
  }

  const screeningCols = new Set(
    db.prepare("PRAGMA table_info(screening_submissions)").all().map((c) => c.name)
  );
  if (!screeningCols.has("patient_id")) {
    db.exec("ALTER TABLE screening_submissions ADD COLUMN patient_id INTEGER REFERENCES patients(id)");
  }
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

function seedContentDefaults() {
  const now = new Date().toISOString();

  if (db.prepare("SELECT COUNT(*) AS count FROM services").get().count === 0) {
    const insert = db.prepare(`
      INSERT INTO services (
        slug, name, short_description, description, icon_path, detail_icon_path,
        photo_url, accent_class, treat_list, whatsapp_message, sort_order, created_at, updated_at
      ) VALUES (
        @slug, @name, @short_description, @description, @icon_path, @detail_icon_path,
        @photo_url, @accent_class, @treat_list, @whatsapp_message, @sort_order, @created_at, @updated_at
      )
    `);
    const seed = db.transaction((rows) => {
      rows.forEach((row) =>
        insert.run({
          ...row,
          treat_list: JSON.stringify(row.treat_list || []),
          created_at: now,
          updated_at: now,
        })
      );
    });
    seed(SERVICES);
  }

  if (db.prepare("SELECT COUNT(*) AS count FROM team_members").get().count === 0) {
    const insert = db.prepare(`
      INSERT INTO team_members (
        name, title, bio, bio_short, photo_url, whatsapp_message, sort_order, created_at, updated_at
      ) VALUES (
        @name, @title, @bio, @bio_short, @photo_url, @whatsapp_message, @sort_order, @created_at, @updated_at
      )
    `);
    const seed = db.transaction((rows) => {
      rows.forEach((row) => insert.run({ ...row, created_at: now, updated_at: now }));
    });
    seed(TEAM_MEMBERS);
  }

  if (db.prepare("SELECT COUNT(*) AS count FROM testimonials").get().count === 0) {
    const insert = db.prepare(`
      INSERT INTO testimonials (
        attribution, quote, avatar_url, stars, sort_order, created_at, updated_at
      ) VALUES (
        @attribution, @quote, @avatar_url, @stars, @sort_order, @created_at, @updated_at
      )
    `);
    const seed = db.transaction((rows) => {
      rows.forEach((row) => insert.run({ ...row, created_at: now, updated_at: now }));
    });
    seed(TESTIMONIALS);
  }

  if (db.prepare("SELECT COUNT(*) AS count FROM blog_posts").get().count === 0) {
    const insert = db.prepare(`
      INSERT INTO blog_posts (
        slug, title, excerpt, category, category_label, tag_class, hero_image_url, hero_image_alt,
        body_html, meta_description, keywords, read_time, published_at, updated_at, is_featured,
        related_slugs, status, whatsapp_cta_heading, whatsapp_cta_text, whatsapp_cta_message, created_at
      ) VALUES (
        @slug, @title, @excerpt, @category, @category_label, @tag_class, @hero_image_url, @hero_image_alt,
        @body_html, @meta_description, @keywords, @read_time, @published_at, @updated_at, @is_featured,
        @related_slugs, @status, @whatsapp_cta_heading, @whatsapp_cta_text, @whatsapp_cta_message, @created_at
      )
    `);
    const seed = db.transaction((rows) => {
      rows.forEach((row) =>
        insert.run({
          ...row,
          related_slugs: JSON.stringify(row.related_slugs || []),
          created_at: now,
        })
      );
    });
    seed(BLOG_POSTS);
  }

  if (db.prepare("SELECT COUNT(*) AS count FROM site_settings").get().count === 0) {
    const insert = db.prepare(
      "INSERT INTO site_settings (key, value, updated_at) VALUES (@key, @value, @updated_at)"
    );
    const seed = db.transaction((entries) => {
      entries.forEach(([key, value]) => insert.run({ key, value: JSON.stringify(value), updated_at: now }));
    });
    seed(Object.entries(SETTINGS));
  }
}

initSchema();
migrateLegacyJson();
seedContentDefaults();

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
        service, preferred_date, preferred_time, duration_minutes, message, status, source, patient_id, created_at, updated_at
      ) VALUES (
        @reference, @name, @phone, @email, @patient_name, @patient_age, @visit_type,
        @service, @preferred_date, @preferred_time, @duration_minutes, @message, 'pending', @source, @patient_id, @created_at, @updated_at
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
      patient_id: payload.patient_id || null,
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

function parseJsonField(value, fallback) {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function withService(row) {
  if (!row) {
    return null;
  }
  return { ...row, treat_list: parseJsonField(row.treat_list, []) };
}

function withBlogPost(row) {
  if (!row) {
    return null;
  }
  return { ...row, related_slugs: parseJsonField(row.related_slugs, []) };
}

function listServices({ activeOnly = false } = {}) {
  const sql = activeOnly
    ? "SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
    : "SELECT * FROM services ORDER BY sort_order ASC, id ASC";
  return db.prepare(sql).all().map(withService);
}

function getServiceBySlug(slug) {
  return withService(db.prepare("SELECT * FROM services WHERE slug = ?").get(slug));
}

function getServiceById(id) {
  return withService(db.prepare("SELECT * FROM services WHERE id = ?").get(id));
}

function createService(payload) {
  const now = nowIso();
  const result = db
    .prepare(
      `
      INSERT INTO services (
        slug, name, short_description, description, icon_path, detail_icon_path,
        photo_url, accent_class, treat_list, whatsapp_message, sort_order, is_active, created_at, updated_at
      ) VALUES (
        @slug, @name, @short_description, @description, @icon_path, @detail_icon_path,
        @photo_url, @accent_class, @treat_list, @whatsapp_message, @sort_order, @is_active, @created_at, @updated_at
      )
    `
    )
    .run({
      slug: payload.slug,
      name: payload.name,
      short_description: payload.short_description || null,
      description: payload.description || null,
      icon_path: payload.icon_path || null,
      detail_icon_path: payload.detail_icon_path || null,
      photo_url: payload.photo_url || null,
      accent_class: payload.accent_class || null,
      treat_list: JSON.stringify(payload.treat_list || []),
      whatsapp_message: payload.whatsapp_message || null,
      sort_order: Number(payload.sort_order) || 0,
      is_active: payload.is_active === false ? 0 : 1,
      created_at: now,
      updated_at: now,
    });
  return getServiceById(result.lastInsertRowid);
}

function updateService(id, payload) {
  const existing = getServiceById(id);
  if (!existing) {
    return null;
  }
  const merged = { ...existing, ...payload };
  db.prepare(
    `
    UPDATE services SET
      slug = @slug, name = @name, short_description = @short_description, description = @description,
      icon_path = @icon_path, detail_icon_path = @detail_icon_path, photo_url = @photo_url,
      accent_class = @accent_class, treat_list = @treat_list, whatsapp_message = @whatsapp_message,
      sort_order = @sort_order, is_active = @is_active, updated_at = @updated_at
    WHERE id = @id
  `
  ).run({
    id,
    slug: merged.slug,
    name: merged.name,
    short_description: merged.short_description || null,
    description: merged.description || null,
    icon_path: merged.icon_path || null,
    detail_icon_path: merged.detail_icon_path || null,
    photo_url: merged.photo_url || null,
    accent_class: merged.accent_class || null,
    treat_list: JSON.stringify(payload.treat_list !== undefined ? payload.treat_list : merged.treat_list || []),
    whatsapp_message: merged.whatsapp_message || null,
    sort_order: Number(merged.sort_order) || 0,
    is_active: merged.is_active === false || merged.is_active === 0 ? 0 : 1,
    updated_at: nowIso(),
  });
  return getServiceById(id);
}

function deleteService(id) {
  return db.prepare("DELETE FROM services WHERE id = ?").run(id).changes > 0;
}

function listTeamMembers({ activeOnly = false } = {}) {
  const sql = activeOnly
    ? "SELECT * FROM team_members WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
    : "SELECT * FROM team_members ORDER BY sort_order ASC, id ASC";
  return db.prepare(sql).all();
}

function getTeamMemberById(id) {
  return db.prepare("SELECT * FROM team_members WHERE id = ?").get(id);
}

function createTeamMember(payload) {
  const now = nowIso();
  const result = db
    .prepare(
      `
      INSERT INTO team_members (
        name, title, bio, bio_short, photo_url, whatsapp_message, sort_order, is_active, created_at, updated_at
      ) VALUES (
        @name, @title, @bio, @bio_short, @photo_url, @whatsapp_message, @sort_order, @is_active, @created_at, @updated_at
      )
    `
    )
    .run({
      name: payload.name,
      title: payload.title || null,
      bio: payload.bio || null,
      bio_short: payload.bio_short || null,
      photo_url: payload.photo_url || null,
      whatsapp_message: payload.whatsapp_message || null,
      sort_order: Number(payload.sort_order) || 0,
      is_active: payload.is_active === false ? 0 : 1,
      created_at: now,
      updated_at: now,
    });
  return getTeamMemberById(result.lastInsertRowid);
}

function updateTeamMember(id, payload) {
  const existing = getTeamMemberById(id);
  if (!existing) {
    return null;
  }
  const merged = { ...existing, ...payload };
  db.prepare(
    `
    UPDATE team_members SET
      name = @name, title = @title, bio = @bio, bio_short = @bio_short, photo_url = @photo_url,
      whatsapp_message = @whatsapp_message, sort_order = @sort_order, is_active = @is_active, updated_at = @updated_at
    WHERE id = @id
  `
  ).run({
    id,
    name: merged.name,
    title: merged.title || null,
    bio: merged.bio || null,
    bio_short: merged.bio_short || null,
    photo_url: merged.photo_url || null,
    whatsapp_message: merged.whatsapp_message || null,
    sort_order: Number(merged.sort_order) || 0,
    is_active: merged.is_active === false || merged.is_active === 0 ? 0 : 1,
    updated_at: nowIso(),
  });
  return getTeamMemberById(id);
}

function deleteTeamMember(id) {
  return db.prepare("DELETE FROM team_members WHERE id = ?").run(id).changes > 0;
}

function listTestimonials({ activeOnly = false } = {}) {
  const sql = activeOnly
    ? "SELECT * FROM testimonials WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
    : "SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC";
  return db.prepare(sql).all();
}

function getTestimonialById(id) {
  return db.prepare("SELECT * FROM testimonials WHERE id = ?").get(id);
}

function createTestimonial(payload) {
  const now = nowIso();
  const result = db
    .prepare(
      `
      INSERT INTO testimonials (attribution, quote, avatar_url, stars, sort_order, is_active, created_at, updated_at)
      VALUES (@attribution, @quote, @avatar_url, @stars, @sort_order, @is_active, @created_at, @updated_at)
    `
    )
    .run({
      attribution: payload.attribution,
      quote: payload.quote,
      avatar_url: payload.avatar_url || null,
      stars: Number(payload.stars) || 5,
      sort_order: Number(payload.sort_order) || 0,
      is_active: payload.is_active === false ? 0 : 1,
      created_at: now,
      updated_at: now,
    });
  return getTestimonialById(result.lastInsertRowid);
}

function updateTestimonial(id, payload) {
  const existing = getTestimonialById(id);
  if (!existing) {
    return null;
  }
  const merged = { ...existing, ...payload };
  db.prepare(
    `
    UPDATE testimonials SET
      attribution = @attribution, quote = @quote, avatar_url = @avatar_url, stars = @stars,
      sort_order = @sort_order, is_active = @is_active, updated_at = @updated_at
    WHERE id = @id
  `
  ).run({
    id,
    attribution: merged.attribution,
    quote: merged.quote,
    avatar_url: merged.avatar_url || null,
    stars: Number(merged.stars) || 5,
    sort_order: Number(merged.sort_order) || 0,
    is_active: merged.is_active === false || merged.is_active === 0 ? 0 : 1,
    updated_at: nowIso(),
  });
  return getTestimonialById(id);
}

function deleteTestimonial(id) {
  return db.prepare("DELETE FROM testimonials WHERE id = ?").run(id).changes > 0;
}

function listBlogPosts({ category, publishedOnly = false, limit } = {}) {
  let sql = "SELECT * FROM blog_posts WHERE 1=1";
  const params = {};

  if (publishedOnly) {
    sql += " AND status = 'published'";
  }
  if (category) {
    sql += " AND category = @category";
    params.category = category;
  }

  sql += " ORDER BY datetime(published_at) DESC, id DESC";

  if (limit) {
    sql += " LIMIT @limit";
    params.limit = Number(limit);
  }

  return db.prepare(sql).all(params).map(withBlogPost);
}

function getBlogPostBySlug(slug) {
  return withBlogPost(db.prepare("SELECT * FROM blog_posts WHERE slug = ?").get(slug));
}

function getBlogPostById(id) {
  return withBlogPost(db.prepare("SELECT * FROM blog_posts WHERE id = ?").get(id));
}

function createBlogPost(payload) {
  const now = nowIso();
  const result = db
    .prepare(
      `
      INSERT INTO blog_posts (
        slug, title, excerpt, category, category_label, tag_class, hero_image_url, hero_image_alt,
        body_html, meta_description, keywords, read_time, published_at, updated_at, is_featured,
        related_slugs, status, whatsapp_cta_heading, whatsapp_cta_text, whatsapp_cta_message, created_at
      ) VALUES (
        @slug, @title, @excerpt, @category, @category_label, @tag_class, @hero_image_url, @hero_image_alt,
        @body_html, @meta_description, @keywords, @read_time, @published_at, @updated_at, @is_featured,
        @related_slugs, @status, @whatsapp_cta_heading, @whatsapp_cta_text, @whatsapp_cta_message, @created_at
      )
    `
    )
    .run({
      slug: payload.slug,
      title: payload.title,
      excerpt: payload.excerpt || null,
      category: payload.category || null,
      category_label: payload.category_label || null,
      tag_class: payload.tag_class || "",
      hero_image_url: payload.hero_image_url || null,
      hero_image_alt: payload.hero_image_alt || null,
      body_html: payload.body_html || "",
      meta_description: payload.meta_description || null,
      keywords: payload.keywords || null,
      read_time: payload.read_time || "2 min read",
      published_at: payload.published_at || now,
      updated_at: now,
      is_featured: payload.is_featured ? 1 : 0,
      related_slugs: JSON.stringify(payload.related_slugs || []),
      status: payload.status || "draft",
      whatsapp_cta_heading: payload.whatsapp_cta_heading || null,
      whatsapp_cta_text: payload.whatsapp_cta_text || null,
      whatsapp_cta_message: payload.whatsapp_cta_message || null,
      created_at: now,
    });
  return getBlogPostById(result.lastInsertRowid);
}

function updateBlogPost(id, payload) {
  const existing = getBlogPostById(id);
  if (!existing) {
    return null;
  }
  const merged = { ...existing, ...payload };
  db.prepare(
    `
    UPDATE blog_posts SET
      slug = @slug, title = @title, excerpt = @excerpt, category = @category, category_label = @category_label,
      tag_class = @tag_class, hero_image_url = @hero_image_url, hero_image_alt = @hero_image_alt,
      body_html = @body_html, meta_description = @meta_description, keywords = @keywords, read_time = @read_time,
      published_at = @published_at, updated_at = @updated_at, is_featured = @is_featured,
      related_slugs = @related_slugs, status = @status, whatsapp_cta_heading = @whatsapp_cta_heading,
      whatsapp_cta_text = @whatsapp_cta_text, whatsapp_cta_message = @whatsapp_cta_message
    WHERE id = @id
  `
  ).run({
    id,
    slug: merged.slug,
    title: merged.title,
    excerpt: merged.excerpt || null,
    category: merged.category || null,
    category_label: merged.category_label || null,
    tag_class: merged.tag_class || "",
    hero_image_url: merged.hero_image_url || null,
    hero_image_alt: merged.hero_image_alt || null,
    body_html: merged.body_html || "",
    meta_description: merged.meta_description || null,
    keywords: merged.keywords || null,
    read_time: merged.read_time || "2 min read",
    published_at: merged.published_at || nowIso(),
    updated_at: nowIso(),
    is_featured: merged.is_featured ? 1 : 0,
    related_slugs: JSON.stringify(
      payload.related_slugs !== undefined ? payload.related_slugs : merged.related_slugs || []
    ),
    status: merged.status || "draft",
    whatsapp_cta_heading: merged.whatsapp_cta_heading || null,
    whatsapp_cta_text: merged.whatsapp_cta_text || null,
    whatsapp_cta_message: merged.whatsapp_cta_message || null,
  });
  return getBlogPostById(id);
}

function deleteBlogPost(id) {
  return db.prepare("DELETE FROM blog_posts WHERE id = ?").run(id).changes > 0;
}

function getSetting(key) {
  const row = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key);
  return row ? parseJsonField(row.value, null) : null;
}

function listSettings() {
  const rows = db.prepare("SELECT key, value FROM site_settings").all();
  const settings = {};
  rows.forEach((row) => {
    settings[row.key] = parseJsonField(row.value, null);
  });
  return settings;
}

function setSetting(key, value) {
  db.prepare(
    `
    INSERT INTO site_settings (key, value, updated_at) VALUES (@key, @value, @updated_at)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `
  ).run({ key, value: JSON.stringify(value), updated_at: nowIso() });
  return getSetting(key);
}

function withScreeningSubmission(row) {
  if (!row) {
    return null;
  }
  return { ...row, answers: parseJsonField(row.answers, {}) };
}

function createScreeningSubmission(payload) {
  const now = nowIso();
  const result = db
    .prepare(
      `
      INSERT INTO screening_submissions (
        category, category_label, age_band, answers, notes, conclusion,
        contact_name, contact_phone, contact_email, patient_id, created_at
      ) VALUES (
        @category, @category_label, @age_band, @answers, @notes, @conclusion,
        @contact_name, @contact_phone, @contact_email, @patient_id, @created_at
      )
    `
    )
    .run({
      category: payload.category,
      category_label: payload.category_label || null,
      age_band: payload.age_band || null,
      answers: JSON.stringify(payload.answers || {}),
      notes: payload.notes || null,
      conclusion: payload.conclusion,
      contact_name: payload.contact_name || null,
      contact_phone: payload.contact_phone || null,
      contact_email: payload.contact_email || null,
      patient_id: payload.patient_id || null,
      created_at: now,
    });
  return withScreeningSubmission(
    db.prepare("SELECT * FROM screening_submissions WHERE id = ?").get(result.lastInsertRowid)
  );
}

function listScreeningSubmissions() {
  return db
    .prepare("SELECT * FROM screening_submissions ORDER BY datetime(created_at) DESC, id DESC")
    .all()
    .map(withScreeningSubmission);
}

function updateScreeningSubmissionReviewed(id, isReviewed) {
  const result = db
    .prepare("UPDATE screening_submissions SET is_reviewed = ? WHERE id = ?")
    .run(isReviewed ? 1 : 0, id);
  return result.changes > 0;
}

function updateScreeningSubmissionContact(id, { contact_name, contact_phone, contact_email }) {
  // Only fills in contact info that hasn't been set yet, so the id returned by the
  // initial anonymous submission can't be reused to overwrite someone else's
  // already-submitted callback details.
  const result = db
    .prepare(
      "UPDATE screening_submissions SET contact_name = ?, contact_phone = ?, contact_email = ? WHERE id = ? AND contact_phone IS NULL"
    )
    .run(contact_name || null, contact_phone || null, contact_email || null, id);
  if (result.changes === 0) {
    return null;
  }
  return withScreeningSubmission(db.prepare("SELECT * FROM screening_submissions WHERE id = ?").get(id));
}

function deleteScreeningSubmission(id) {
  return db.prepare("DELETE FROM screening_submissions WHERE id = ?").run(id).changes > 0;
}

function withoutPasswordHash(patient) {
  if (!patient) {
    return null;
  }
  const { password_hash, ...safe } = patient;
  return safe;
}

function createPatient({ name, email, phone, password }) {
  const now = nowIso();
  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare(
      `
      INSERT INTO patients (name, email, phone, password_hash, created_at, updated_at)
      VALUES (@name, @email, @phone, @password_hash, @created_at, @updated_at)
    `
    )
    .run({
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    });

  return getPatientById(result.lastInsertRowid);
}

function getPatientByEmail(email) {
  return db.prepare("SELECT * FROM patients WHERE email = ?").get(String(email || "").toLowerCase());
}

function getPatientById(id) {
  return withoutPasswordHash(db.prepare("SELECT * FROM patients WHERE id = ?").get(id));
}

function verifyPatientPassword(email, password) {
  const patient = getPatientByEmail(email);
  if (!patient) {
    return null;
  }
  if (!bcrypt.compareSync(password, patient.password_hash)) {
    return null;
  }
  return withoutPasswordHash(patient);
}

function listBookingsForPatient(patientId) {
  return db
    .prepare("SELECT * FROM bookings WHERE patient_id = ? ORDER BY datetime(created_at) DESC, id DESC")
    .all(patientId);
}

function listScreeningSubmissionsForPatient(patientId) {
  return db
    .prepare(
      "SELECT * FROM screening_submissions WHERE patient_id = ? ORDER BY datetime(created_at) DESC, id DESC"
    )
    .all(patientId)
    .map(withScreeningSubmission);
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
  listServices,
  getServiceBySlug,
  getServiceById,
  createService,
  updateService,
  deleteService,
  listTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  listTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  listBlogPosts,
  getBlogPostBySlug,
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getSetting,
  listSettings,
  setSetting,
  createScreeningSubmission,
  listScreeningSubmissions,
  updateScreeningSubmissionReviewed,
  updateScreeningSubmissionContact,
  deleteScreeningSubmission,
  createPatient,
  getPatientByEmail,
  getPatientById,
  verifyPatientPassword,
  listBookingsForPatient,
  listScreeningSubmissionsForPatient,
};
