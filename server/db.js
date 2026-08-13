"use strict";

const crypto = require("crypto");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { SERVICES, TEAM_MEMBERS, TESTIMONIALS, BLOG_POSTS, SETTINGS } = require("./seedContent");

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL (or POSTGRES_URL) is not set. This app needs a Postgres connection string — see .env.example."
  );
}

// Neon/Vercel Postgres require TLS; a local dev/test database on localhost does not.
const isLocalDb = /localhost|127\.0\.0\.1/.test(connectionString);

// Supabase/Vercel-provisioned connection strings include `sslmode=require`,
// which pg's connection-string parser turns into its own ssl setting that can
// take precedence over the explicit `ssl` option below — causing "self-signed
// certificate in certificate chain" even with rejectUnauthorized: false set.
// Stripping it from the string forces our explicit ssl config to be the only
// source of truth.
function stripSslModeParam(str) {
  try {
    const url = new URL(str);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");
    return url.toString();
  } catch {
    return str;
  }
}

const pool = new Pool({
  connectionString: isLocalDb ? connectionString : stripSslModeParam(connectionString),
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
  // Serverless best practice: keep each function instance's own pool small and
  // rely on the upstream PgBouncer-style pooler (Neon/Vercel Postgres provide
  // one) for real connection reuse across concurrent invocations.
  max: Number(process.env.PG_POOL_MAX) || 5,
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

async function queryAll(text, params) {
  const result = await query(text, params);
  return result.rows;
}

async function queryOne(text, params) {
  const rows = await queryAll(text, params);
  return rows[0] || null;
}

// Adds the `service` column to an availability_slots table that predates it
// (the live database already had this table before per-service slots were
// introduced), and swaps the old (slot_date, slot_time) unique constraint for
// one that includes service, so the same time can be opened independently
// for different therapies. Idempotent — safe to run on every cold start.
async function migrateAvailabilityServiceColumn() {
  await query(`ALTER TABLE availability_slots ADD COLUMN IF NOT EXISTS service TEXT NOT NULL DEFAULT ''`);

  const oldConstraint = await queryOne(`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'availability_slots' AND constraint_type = 'UNIQUE'
      AND constraint_name = 'availability_slots_slot_date_slot_time_key'
  `);
  if (oldConstraint) {
    await query(`ALTER TABLE availability_slots DROP CONSTRAINT availability_slots_slot_date_slot_time_key`);
  }

  const newConstraint = await queryOne(`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'availability_slots' AND constraint_type = 'UNIQUE'
      AND constraint_name = 'availability_slots_slot_date_slot_time_service_key'
  `);
  if (!newConstraint) {
    await query(
      `ALTER TABLE availability_slots ADD CONSTRAINT availability_slots_slot_date_slot_time_service_key UNIQUE (slot_date, slot_time, service)`
    );
  }
}

// Adds advance-payment tracking columns to a bookings table that predates
// them (the live database already had this table before payments were
// introduced). Idempotent — safe to run on every cold start.
async function migrateBookingPaymentColumns() {
  await query(`
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_amount INTEGER;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference TEXT;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_ref_id TEXT;
  `);

  const existingConstraint = await queryOne(`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'bookings' AND constraint_type = 'UNIQUE'
      AND constraint_name = 'bookings_payment_reference_key'
  `);
  if (!existingConstraint) {
    await query(`ALTER TABLE bookings ADD CONSTRAINT bookings_payment_reference_key UNIQUE (payment_reference)`);
  }
}

async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
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
      duration_minutes INTEGER,
      patient_id INTEGER REFERENCES patients(id),
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_amount INTEGER,
      payment_reference TEXT UNIQUE,
      payment_ref_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS availability_slots (
      id SERIAL PRIMARY KEY,
      slot_date TEXT NOT NULL,
      slot_time TEXT NOT NULL,
      service TEXT NOT NULL DEFAULT '',
      is_available INTEGER NOT NULL DEFAULT 1,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      UNIQUE(slot_date, slot_time, service)
    );

    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
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
      id SERIAL PRIMARY KEY,
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
      id SERIAL PRIMARY KEY,
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
      id SERIAL PRIMARY KEY,
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

    CREATE TABLE IF NOT EXISTS therapists (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      service TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS screening_submissions (
      id SERIAL PRIMARY KEY,
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
      patient_id INTEGER REFERENCES patients(id),
      created_at TEXT NOT NULL
    );
  `);

  await migrateAvailabilityServiceColumn();
  await migrateBookingPaymentColumns();

  await query(`
    CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(reference);
    CREATE INDEX IF NOT EXISTS idx_bookings_patient ON bookings(patient_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_availability_date ON availability_slots(slot_date);
    CREATE INDEX IF NOT EXISTS idx_availability_date_service ON availability_slots(slot_date, service);
    CREATE INDEX IF NOT EXISTS idx_services_sort ON services(sort_order);
    CREATE INDEX IF NOT EXISTS idx_team_sort ON team_members(sort_order);
    CREATE INDEX IF NOT EXISTS idx_testimonials_sort ON testimonials(sort_order);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
    CREATE INDEX IF NOT EXISTS idx_screening_created_at ON screening_submissions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_screening_patient ON screening_submissions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
    CREATE INDEX IF NOT EXISTS idx_therapists_email ON therapists(email);
    CREATE INDEX IF NOT EXISTS idx_therapists_service ON therapists(service);
  `);
}

function referencePrefixForDate(date) {
  const y = String(date.getFullYear()).slice(2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `DWC-${y}${m}${d}`;
}

function buildReferenceForDate(date, seqNumber) {
  return `${referencePrefixForDate(date)}-${String(seqNumber).padStart(3, "0")}`;
}

// Builds one multi-row INSERT instead of N single-row INSERTs. Cold-start
// seeding on a remote Postgres (e.g. Supabase over the internet, not a local
// socket) pays real network latency per round trip — inserting ~20 seed rows
// one at a time across 5 tables was enough sequential round trips to risk
// exceeding a serverless function's execution timeout. This does one round
// trip per table instead.
function buildBulkInsert(table, columns, rows) {
  const values = [];
  const params = [];
  let i = 1;
  for (const row of rows) {
    values.push(`(${row.map(() => `$${i++}`).join(", ")})`);
    params.push(...row);
  }
  return {
    sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${values.join(", ")}`,
    params,
  };
}

async function seedContentDefaults() {
  const now = new Date().toISOString();

  const [servicesCount, teamCount, testimonialsCount, blogCount, settingsCount] = await Promise.all([
    queryOne("SELECT COUNT(*)::int AS count FROM services"),
    queryOne("SELECT COUNT(*)::int AS count FROM team_members"),
    queryOne("SELECT COUNT(*)::int AS count FROM testimonials"),
    queryOne("SELECT COUNT(*)::int AS count FROM blog_posts"),
    queryOne("SELECT COUNT(*)::int AS count FROM site_settings"),
  ]);

  const seedTasks = [];

  if (servicesCount.count === 0) {
    const { sql, params } = buildBulkInsert(
      "services",
      [
        "slug", "name", "short_description", "description", "icon_path", "detail_icon_path",
        "photo_url", "accent_class", "treat_list", "whatsapp_message", "sort_order", "created_at", "updated_at",
      ],
      SERVICES.map((row) => [
        row.slug,
        row.name,
        row.short_description || null,
        row.description || null,
        row.icon_path || null,
        row.detail_icon_path || null,
        row.photo_url || null,
        row.accent_class || null,
        JSON.stringify(row.treat_list || []),
        row.whatsapp_message || null,
        row.sort_order || 0,
        now,
        now,
      ])
    );
    seedTasks.push(query(sql, params));
  }

  if (teamCount.count === 0) {
    const { sql, params } = buildBulkInsert(
      "team_members",
      ["name", "title", "bio", "bio_short", "photo_url", "whatsapp_message", "sort_order", "created_at", "updated_at"],
      TEAM_MEMBERS.map((row) => [
        row.name,
        row.title || null,
        row.bio || null,
        row.bio_short || null,
        row.photo_url || null,
        row.whatsapp_message || null,
        row.sort_order || 0,
        now,
        now,
      ])
    );
    seedTasks.push(query(sql, params));
  }

  if (testimonialsCount.count === 0) {
    const { sql, params } = buildBulkInsert(
      "testimonials",
      ["attribution", "quote", "avatar_url", "stars", "sort_order", "created_at", "updated_at"],
      TESTIMONIALS.map((row) => [
        row.attribution,
        row.quote,
        row.avatar_url || null,
        row.stars || 5,
        row.sort_order || 0,
        now,
        now,
      ])
    );
    seedTasks.push(query(sql, params));
  }

  if (blogCount.count === 0) {
    const { sql, params } = buildBulkInsert(
      "blog_posts",
      [
        "slug", "title", "excerpt", "category", "category_label", "tag_class", "hero_image_url", "hero_image_alt",
        "body_html", "meta_description", "keywords", "read_time", "published_at", "updated_at", "is_featured",
        "related_slugs", "status", "whatsapp_cta_heading", "whatsapp_cta_text", "whatsapp_cta_message", "created_at",
      ],
      BLOG_POSTS.map((row) => [
        row.slug,
        row.title,
        row.excerpt || null,
        row.category || null,
        row.category_label || null,
        row.tag_class || "",
        row.hero_image_url || null,
        row.hero_image_alt || null,
        row.body_html || "",
        row.meta_description || null,
        row.keywords || null,
        row.read_time || "2 min read",
        row.published_at || now,
        now,
        row.is_featured ? 1 : 0,
        JSON.stringify(row.related_slugs || []),
        row.status || "draft",
        row.whatsapp_cta_heading || null,
        row.whatsapp_cta_text || null,
        row.whatsapp_cta_message || null,
        now,
      ])
    );
    seedTasks.push(query(sql, params));
  }

  if (settingsCount.count === 0) {
    const { sql, params } = buildBulkInsert(
      "site_settings",
      ["key", "value", "updated_at"],
      Object.entries(SETTINGS).map(([key, value]) => [key, JSON.stringify(value), now])
    );
    seedTasks.push(query(sql, params));
  }

  await Promise.all(seedTasks);
}

let readyPromise = null;

function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await initSchema();
      await seedContentDefaults();
    })().catch((err) => {
      // Let the next call retry instead of permanently caching a failed boot.
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

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
  Consultation: 15,
  "Speech Therapy": 30,
  "Occupational Therapy": 45,
  "Behaviour Therapy": 45,
  "Psychological Counselling": 45,
  "Voice Therapy": 30,
  "Special Education Support": 45,
  Other: 45,
};

const DEFAULT_DURATION_MINUTES = 45;
const ADVANCE_PAYMENT_AMOUNT = Number(process.env.ADVANCE_PAYMENT_AMOUNT) || 200;
// A pending-payment booking still holds its slot reservation; if the patient
// never completes (or abandons) checkout, the slot would stay blocked
// forever. Anything past this age is treated as abandoned and released the
// next time availability is checked for that date — see releaseStalePendingPayments.
const PAYMENT_PENDING_EXPIRY_MINUTES = 20;
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

async function listAvailabilitySlots(date, service, { includeUnavailable = false } = {}) {
  await ensureReady();
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
    WHERE s.slot_date = $1 AND s.service = $2
  `;

  if (!includeUnavailable) {
    sql += " AND s.is_available = 1 AND s.booking_id IS NULL";
  }

  sql += " ORDER BY s.slot_time ASC";

  return queryAll(sql, [date, service]);
}

function listAvailabilityForDate(date, service, options = {}) {
  return listAvailabilitySlots(date, service, options);
}

async function getActiveBookingsForDate(date, service) {
  return queryAll(
    `
      SELECT id, preferred_time, duration_minutes, service, status
      FROM bookings
      WHERE preferred_date = $1
        AND service = $2
        AND preferred_time IS NOT NULL
        AND status IN ('pending', 'confirmed')
    `,
    [date, service]
  );
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

async function isSlotWindowOpen(date, startMinutes, durationMinutes, service) {
  for (let minute = startMinutes; minute < startMinutes + durationMinutes; minute += SLOT_INTERVAL_MINUTES) {
    const slot = await getAvailabilitySlot(date, minutesToTime(minute), service);

    if (!slot || !slot.is_available || slot.booking_id) {
      return false;
    }
  }

  return true;
}

async function isStartTimeAvailable(date, startTime, durationMinutes, service, excludeBookingId = null) {
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

  // Overlap is only checked against other bookings of the SAME service — a
  // different therapy at the same time is assumed to be a different
  // therapist, so it doesn't block this one. The admin controls this in
  // practice by choosing which services to open at which times.
  const bookings = await getActiveBookingsForDate(date, service);

  if (bookingsOverlap(startMinutes, durationMinutes, bookings, excludeBookingId)) {
    return false;
  }

  return isSlotWindowOpen(date, startMinutes, durationMinutes, service);
}

async function listAvailableStartTimes(date, service) {
  await ensureReady();
  await releaseStalePendingPayments();
  const durationMinutes = getServiceDuration(service);
  const starts = [];

  for (
    let startMinutes = CLINIC_OPEN_MINUTES;
    startMinutes + durationMinutes <= CLINIC_CLOSE_MINUTES;
    startMinutes += SLOT_INTERVAL_MINUTES
  ) {
    const time = minutesToTime(startMinutes);

    if (await isStartTimeAvailable(date, time, durationMinutes, service)) {
      starts.push({
        time,
        label: formatTimeRangeLabel(time, durationMinutes),
        duration_minutes: durationMinutes,
      });
    }
  }

  return starts;
}

// The server runs in UTC (Vercel's default), but slot times are clinic-local
// wall-clock (Nepal, UTC+5:45) — shifting the timestamp before reading its
// UTC getters is a simple way to read "Nepal local" date/time without
// touching the process's actual timezone.
const NEPAL_OFFSET_MINUTES = 5 * 60 + 45;
function nepalNow() {
  return new Date(Date.now() + NEPAL_OFFSET_MINUTES * 60 * 1000);
}

function isoDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

// Scans forward from today, per service, to find the next few open slots —
// powers the "next available" quick-pick shown on the booking page before a
// patient has chosen a date. Capped at MAX_LOOKAHEAD_DAYS so an empty
// calendar (nothing opened yet) doesn't scan indefinitely; each date lookup
// reuses the same accurate consecutive-slot check as normal booking, so a
// suggested time is always genuinely bookable. Already-passed times today
// are filtered out — otherwise "Today 7:00 AM" could show as a one-click
// suggestion at 3pm.
const UPCOMING_SLOTS_LOOKAHEAD_DAYS = 7;

async function listUpcomingSlotsByService({ limit = 3, services } = {}) {
  await ensureReady();
  const serviceList = services || Object.keys(SERVICE_DURATIONS).filter((name) => name !== "Other");
  const nowNepal = nepalNow();
  const nowMinutes = nowNepal.getUTCHours() * 60 + nowNepal.getUTCMinutes();
  const result = {};

  for (const service of serviceList) {
    const found = [];
    for (let dayOffset = 0; dayOffset < UPCOMING_SLOTS_LOOKAHEAD_DAYS && found.length < limit; dayOffset++) {
      const date = new Date(nowNepal);
      date.setUTCDate(date.getUTCDate() + dayOffset);
      const dateStr = isoDateOnly(date);

      let starts = await listAvailableStartTimes(dateStr, service);
      if (dayOffset === 0) {
        starts = starts.filter((start) => timeToMinutes(start.time) > nowMinutes);
      }

      for (const start of starts) {
        if (found.length >= limit) break;
        found.push({ date: dateStr, ...start });
      }
    }
    result[service] = found;
  }

  return result;
}

async function getAvailabilitySlot(date, time, service) {
  const slotTime = normalizeTime(time);
  if (!date || !slotTime) {
    return null;
  }

  return queryOne("SELECT * FROM availability_slots WHERE slot_date = $1 AND slot_time = $2 AND service = $3", [
    date,
    slotTime,
    service,
  ]);
}

async function addAvailabilitySlot(date, time, service) {
  await ensureReady();
  const slotTime = normalizeTime(time);
  if (!date || !slotTime || !service) {
    return null;
  }

  const existing = await getAvailabilitySlot(date, slotTime, service);
  if (existing) {
    return existing;
  }

  const row = await queryOne(
    `INSERT INTO availability_slots (slot_date, slot_time, service, is_available, created_at)
     VALUES ($1, $2, $3, 1, $4) RETURNING *`,
    [date, slotTime, service, nowIso()]
  );

  return row;
}

async function addStandardAvailability(date, service) {
  const created = [];

  for (const time of STANDARD_SLOT_TIMES) {
    const slot = await addAvailabilitySlot(date, time, service);
    if (slot) {
      created.push(slot);
    }
  }

  return created;
}

async function setAvailabilitySlot(id, payload) {
  await ensureReady();
  const existing = await queryOne("SELECT * FROM availability_slots WHERE id = $1", [id]);
  if (!existing) {
    return null;
  }

  if (existing.booking_id && payload.is_available === 1) {
    return null;
  }

  const isAvailable = payload.is_available === undefined ? existing.is_available : payload.is_available ? 1 : 0;

  await query("UPDATE availability_slots SET is_available = $1 WHERE id = $2", [isAvailable, id]);

  return queryOne("SELECT * FROM availability_slots WHERE id = $1", [id]);
}

async function deleteAvailabilitySlot(id) {
  await ensureReady();
  const existing = await queryOne("SELECT * FROM availability_slots WHERE id = $1", [id]);
  if (!existing || existing.booking_id) {
    return false;
  }

  const result = await query("DELETE FROM availability_slots WHERE id = $1", [id]);
  return result.rowCount > 0;
}

async function reserveAvailabilitySlot(date, time, bookingId, durationMinutes, service) {
  const startMinutes = timeToMinutes(time);
  if (startMinutes === null) {
    return false;
  }

  if (!(await isStartTimeAvailable(date, time, durationMinutes, service, bookingId))) {
    return false;
  }

  for (let minute = startMinutes; minute < startMinutes + durationMinutes; minute += SLOT_INTERVAL_MINUTES) {
    const result = await query(
      `UPDATE availability_slots
       SET is_available = 0, booking_id = $1
       WHERE slot_date = $2 AND slot_time = $3 AND service = $4 AND is_available = 1 AND booking_id IS NULL`,
      [bookingId, date, minutesToTime(minute), service]
    );
    if (result.rowCount === 0) {
      await releaseAvailabilityForBooking(bookingId);
      return false;
    }
  }

  return true;
}

async function releaseAvailabilityForBooking(bookingId) {
  await query(
    `UPDATE availability_slots
     SET is_available = 1, booking_id = NULL
     WHERE booking_id = $1`,
    [bookingId]
  );
}

async function isSlotBookable(date, time, service) {
  const durationMinutes = getServiceDuration(service);
  return isStartTimeAvailable(date, time, durationMinutes, service);
}

async function createBooking(payload) {
  await ensureReady();
  await releaseStalePendingPayments();
  const createdAt = nowIso();
  const preferredDate = payload.preferred_date || null;
  const preferredTime = normalizeTime(payload.preferred_time);
  const durationMinutes = getServiceDuration(payload.service);

  if (preferredDate && preferredTime && !(await isSlotBookable(preferredDate, preferredTime, payload.service))) {
    const error = new Error("That time slot is no longer available. Please choose another time.");
    error.code = "SLOT_UNAVAILABLE";
    throw error;
  }

  const prefix = referencePrefixForDate(new Date(createdAt));

  // Reference numbers are derived from same-day COUNT(*), which is safe under
  // SQLite's single-writer model but not under real concurrent Postgres writers
  // — two simultaneous bookings could compute the same count and collide on
  // the UNIQUE reference constraint. Retry a couple of times on that specific
  // conflict rather than adding a heavier locking scheme for a small clinic's
  // traffic volume.
  let booking = null;
  let lastError = null;
  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    const countRow = await queryOne("SELECT COUNT(*)::int AS count FROM bookings WHERE reference LIKE $1", [
      `${prefix}-%`,
    ]);
    const reference = buildReferenceForDate(new Date(createdAt), countRow.count + 1 + attempt);

    try {
      booking = await queryOne(
        `INSERT INTO bookings (
          reference, name, phone, email, patient_name, patient_age, visit_type,
          service, preferred_date, preferred_time, duration_minutes, message, status, source, patient_id,
          payment_status, payment_amount, payment_reference, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13, $14, 'pending', $15, $16, $17, $18)
        RETURNING *`,
        [
          reference,
          payload.name,
          payload.phone,
          payload.email,
          payload.patient_name,
          payload.patient_age,
          payload.visit_type || "new",
          payload.service,
          preferredDate,
          preferredTime,
          durationMinutes,
          payload.message,
          payload.source || "website",
          payload.patient_id || null,
          ADVANCE_PAYMENT_AMOUNT,
          crypto.randomUUID(),
          createdAt,
          createdAt,
        ]
      );
    } catch (err) {
      if (err.code === "23505" && err.constraint && err.constraint.includes("reference")) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  if (!booking) {
    throw lastError || new Error("Could not generate a unique booking reference.");
  }

  if (preferredDate && preferredTime) {
    const reserved = await reserveAvailabilitySlot(
      preferredDate,
      preferredTime,
      booking.id,
      durationMinutes,
      payload.service
    );

    if (!reserved) {
      await query("DELETE FROM bookings WHERE id = $1", [booking.id]);
      const error = new Error("That time slot is no longer available. Please choose another time.");
      error.code = "SLOT_UNAVAILABLE";
      throw error;
    }
  }

  return booking;
}

async function getBookingByPaymentReference(paymentReference) {
  await ensureReady();
  return queryOne("SELECT * FROM bookings WHERE payment_reference = $1", [paymentReference]);
}

async function markBookingPaymentPaid(paymentReference, refId) {
  await ensureReady();
  return queryOne(
    `UPDATE bookings SET payment_status = 'paid', payment_ref_id = $1, updated_at = $2
     WHERE payment_reference = $3 AND payment_status = 'pending'
     RETURNING *`,
    [refId || null, nowIso(), paymentReference]
  );
}

async function markBookingPaymentFailed(paymentReference) {
  await ensureReady();
  const booking = await getBookingByPaymentReference(paymentReference);
  if (!booking || booking.payment_status !== "pending") {
    return null;
  }

  await releaseAvailabilityForBooking(booking.id);
  return queryOne(
    `UPDATE bookings SET payment_status = 'failed', status = 'cancelled', updated_at = $1
     WHERE id = $2
     RETURNING *`,
    [nowIso(), booking.id]
  );
}

// Frees up slots held by abandoned payment attempts — a patient who starts
// checkout but never completes or explicitly cancels it would otherwise
// block that slot forever. Cheap to call on every availability check since
// it's scoped to old-enough rows only; no separate cron job needed.
async function releaseStalePendingPayments() {
  const cutoff = new Date(Date.now() - PAYMENT_PENDING_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const stale = await queryAll(
    `SELECT id FROM bookings WHERE payment_status = 'pending' AND status = 'pending' AND created_at < $1`,
    [cutoff]
  );

  for (const row of stale) {
    await releaseAvailabilityForBooking(row.id);
    await query(
      `UPDATE bookings SET payment_status = 'expired', status = 'cancelled', updated_at = $1 WHERE id = $2`,
      [nowIso(), row.id]
    );
  }
}

async function createContact(payload) {
  await ensureReady();
  return queryOne(
    `INSERT INTO messages (name, email, subject, message, is_read, created_at)
     VALUES ($1, $2, $3, $4, 0, $5) RETURNING *`,
    [payload.name, payload.email, payload.subject, payload.message, nowIso()]
  );
}

async function listBookings(filters = {}) {
  await ensureReady();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const search = filters.search ? String(filters.search).trim() : "";
  const service = filters.service ? String(filters.service).trim() : "";

  let sql = "SELECT * FROM bookings WHERE 1=1";
  const params = [];

  if (status) {
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }

  if (service) {
    params.push(service);
    sql += ` AND service = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    sql += `
      AND (
        reference ILIKE ${p} OR name ILIKE ${p} OR phone ILIKE ${p}
        OR patient_name ILIKE ${p} OR service ILIKE ${p} OR email ILIKE ${p}
      )
    `;
  }

  sql += " ORDER BY created_at DESC, id DESC";

  return queryAll(sql, params);
}

async function getBookingById(id) {
  await ensureReady();
  return queryOne("SELECT * FROM bookings WHERE id = $1", [id]);
}

async function updateBooking(id, payload) {
  await ensureReady();
  const existing = await getBookingById(id);
  if (!existing) {
    return null;
  }

  const allowedStatuses = ["pending", "confirmed", "cancelled", "completed", "no_show"];
  const status = payload.status !== undefined ? String(payload.status).trim() : existing.status;

  if (!allowedStatuses.includes(status)) {
    return null;
  }

  if (status === "cancelled" && existing.status !== "cancelled") {
    await releaseAvailabilityForBooking(id);
  }

  const confirmed_date =
    payload.confirmed_date !== undefined ? payload.confirmed_date || null : existing.confirmed_date;
  const confirmed_time =
    payload.confirmed_time !== undefined ? normalizeTime(payload.confirmed_time) || null : existing.confirmed_time;
  const assigned_to = payload.assigned_to !== undefined ? payload.assigned_to || null : existing.assigned_to;
  const admin_notes = payload.admin_notes !== undefined ? payload.admin_notes || null : existing.admin_notes;

  const result = await query(
    `UPDATE bookings SET
       status = $1, confirmed_date = $2, confirmed_time = $3,
       assigned_to = $4, admin_notes = $5, updated_at = $6
     WHERE id = $7`,
    [status, confirmed_date, confirmed_time, assigned_to, admin_notes, nowIso(), id]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getBookingById(id);
}

function updateBookingStatus(id, status) {
  return updateBooking(id, { status });
}

async function deleteBooking(id) {
  await ensureReady();
  await releaseAvailabilityForBooking(id);
  const result = await query("DELETE FROM bookings WHERE id = $1", [id]);
  return result.rowCount > 0;
}

async function listMessages() {
  await ensureReady();
  return queryAll("SELECT * FROM messages ORDER BY created_at DESC, id DESC");
}

async function updateMessageRead(id, isRead) {
  await ensureReady();
  const result = await query("UPDATE messages SET is_read = $1 WHERE id = $2", [isRead ? 1 : 0, id]);
  return result.rowCount > 0;
}

async function getStats() {
  await ensureReady();
  const [bookings, messages, pending, confirmed, unread] = await Promise.all([
    queryOne("SELECT COUNT(*)::int AS count FROM bookings"),
    queryOne("SELECT COUNT(*)::int AS count FROM messages"),
    queryOne("SELECT COUNT(*)::int AS count FROM bookings WHERE status = 'pending'"),
    queryOne("SELECT COUNT(*)::int AS count FROM bookings WHERE status = 'confirmed'"),
    queryOne("SELECT COUNT(*)::int AS count FROM messages WHERE is_read = 0"),
  ]);

  return {
    bookings: bookings.count,
    messages: messages.count,
    pending: pending.count,
    confirmed: confirmed.count,
    unread: unread.count,
  };
}

async function getDbInfo() {
  const stats = await getStats();
  return {
    type: "postgres",
    ...stats,
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

async function listServices({ activeOnly = false } = {}) {
  await ensureReady();
  const sql = activeOnly
    ? "SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
    : "SELECT * FROM services ORDER BY sort_order ASC, id ASC";
  const rows = await queryAll(sql);
  return rows.map(withService);
}

async function getServiceBySlug(slug) {
  await ensureReady();
  return withService(await queryOne("SELECT * FROM services WHERE slug = $1", [slug]));
}

async function getServiceById(id) {
  await ensureReady();
  return withService(await queryOne("SELECT * FROM services WHERE id = $1", [id]));
}

async function createService(payload) {
  await ensureReady();
  const now = nowIso();
  const row = await queryOne(
    `INSERT INTO services (
      slug, name, short_description, description, icon_path, detail_icon_path,
      photo_url, accent_class, treat_list, whatsapp_message, sort_order, is_active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      payload.slug,
      payload.name,
      payload.short_description || null,
      payload.description || null,
      payload.icon_path || null,
      payload.detail_icon_path || null,
      payload.photo_url || null,
      payload.accent_class || null,
      JSON.stringify(payload.treat_list || []),
      payload.whatsapp_message || null,
      Number(payload.sort_order) || 0,
      payload.is_active === false ? 0 : 1,
      now,
      now,
    ]
  );
  return withService(row);
}

async function updateService(id, payload) {
  await ensureReady();
  const existing = await getServiceById(id);
  if (!existing) {
    return null;
  }
  const merged = { ...existing, ...payload };
  const result = await query(
    `UPDATE services SET
       slug = $1, name = $2, short_description = $3, description = $4,
       icon_path = $5, detail_icon_path = $6, photo_url = $7,
       accent_class = $8, treat_list = $9, whatsapp_message = $10,
       sort_order = $11, is_active = $12, updated_at = $13
     WHERE id = $14`,
    [
      merged.slug,
      merged.name,
      merged.short_description || null,
      merged.description || null,
      merged.icon_path || null,
      merged.detail_icon_path || null,
      merged.photo_url || null,
      merged.accent_class || null,
      JSON.stringify(payload.treat_list !== undefined ? payload.treat_list : merged.treat_list || []),
      merged.whatsapp_message || null,
      Number(merged.sort_order) || 0,
      merged.is_active === false || merged.is_active === 0 ? 0 : 1,
      nowIso(),
      id,
    ]
  );
  if (result.rowCount === 0) {
    return null;
  }
  return getServiceById(id);
}

async function deleteService(id) {
  await ensureReady();
  const result = await query("DELETE FROM services WHERE id = $1", [id]);
  return result.rowCount > 0;
}

async function listTeamMembers({ activeOnly = false } = {}) {
  await ensureReady();
  const sql = activeOnly
    ? "SELECT * FROM team_members WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
    : "SELECT * FROM team_members ORDER BY sort_order ASC, id ASC";
  return queryAll(sql);
}

async function getTeamMemberById(id) {
  await ensureReady();
  return queryOne("SELECT * FROM team_members WHERE id = $1", [id]);
}

async function createTeamMember(payload) {
  await ensureReady();
  const now = nowIso();
  return queryOne(
    `INSERT INTO team_members (
      name, title, bio, bio_short, photo_url, whatsapp_message, sort_order, is_active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      payload.name,
      payload.title || null,
      payload.bio || null,
      payload.bio_short || null,
      payload.photo_url || null,
      payload.whatsapp_message || null,
      Number(payload.sort_order) || 0,
      payload.is_active === false ? 0 : 1,
      now,
      now,
    ]
  );
}

async function updateTeamMember(id, payload) {
  await ensureReady();
  const existing = await getTeamMemberById(id);
  if (!existing) {
    return null;
  }
  const merged = { ...existing, ...payload };
  await query(
    `UPDATE team_members SET
       name = $1, title = $2, bio = $3, bio_short = $4, photo_url = $5,
       whatsapp_message = $6, sort_order = $7, is_active = $8, updated_at = $9
     WHERE id = $10`,
    [
      merged.name,
      merged.title || null,
      merged.bio || null,
      merged.bio_short || null,
      merged.photo_url || null,
      merged.whatsapp_message || null,
      Number(merged.sort_order) || 0,
      merged.is_active === false || merged.is_active === 0 ? 0 : 1,
      nowIso(),
      id,
    ]
  );
  return getTeamMemberById(id);
}

async function deleteTeamMember(id) {
  await ensureReady();
  const result = await query("DELETE FROM team_members WHERE id = $1", [id]);
  return result.rowCount > 0;
}

async function listTestimonials({ activeOnly = false } = {}) {
  await ensureReady();
  const sql = activeOnly
    ? "SELECT * FROM testimonials WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
    : "SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC";
  return queryAll(sql);
}

async function getTestimonialById(id) {
  await ensureReady();
  return queryOne("SELECT * FROM testimonials WHERE id = $1", [id]);
}

async function createTestimonial(payload) {
  await ensureReady();
  const now = nowIso();
  return queryOne(
    `INSERT INTO testimonials (attribution, quote, avatar_url, stars, sort_order, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      payload.attribution,
      payload.quote,
      payload.avatar_url || null,
      Number(payload.stars) || 5,
      Number(payload.sort_order) || 0,
      payload.is_active === false ? 0 : 1,
      now,
      now,
    ]
  );
}

async function updateTestimonial(id, payload) {
  await ensureReady();
  const existing = await getTestimonialById(id);
  if (!existing) {
    return null;
  }
  const merged = { ...existing, ...payload };
  await query(
    `UPDATE testimonials SET
       attribution = $1, quote = $2, avatar_url = $3, stars = $4,
       sort_order = $5, is_active = $6, updated_at = $7
     WHERE id = $8`,
    [
      merged.attribution,
      merged.quote,
      merged.avatar_url || null,
      Number(merged.stars) || 5,
      Number(merged.sort_order) || 0,
      merged.is_active === false || merged.is_active === 0 ? 0 : 1,
      nowIso(),
      id,
    ]
  );
  return getTestimonialById(id);
}

async function deleteTestimonial(id) {
  await ensureReady();
  const result = await query("DELETE FROM testimonials WHERE id = $1", [id]);
  return result.rowCount > 0;
}

async function listBlogPosts({ category, publishedOnly = false, limit } = {}) {
  await ensureReady();
  let sql = "SELECT * FROM blog_posts WHERE 1=1";
  const params = [];

  if (publishedOnly) {
    sql += " AND status = 'published'";
  }
  if (category) {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }

  sql += " ORDER BY published_at DESC, id DESC";

  if (limit) {
    params.push(Number(limit));
    sql += ` LIMIT $${params.length}`;
  }

  const rows = await queryAll(sql, params);
  return rows.map(withBlogPost);
}

async function getBlogPostBySlug(slug) {
  await ensureReady();
  return withBlogPost(await queryOne("SELECT * FROM blog_posts WHERE slug = $1", [slug]));
}

async function getBlogPostById(id) {
  await ensureReady();
  return withBlogPost(await queryOne("SELECT * FROM blog_posts WHERE id = $1", [id]));
}

async function createBlogPost(payload) {
  await ensureReady();
  const now = nowIso();
  const row = await queryOne(
    `INSERT INTO blog_posts (
      slug, title, excerpt, category, category_label, tag_class, hero_image_url, hero_image_alt,
      body_html, meta_description, keywords, read_time, published_at, updated_at, is_featured,
      related_slugs, status, whatsapp_cta_heading, whatsapp_cta_text, whatsapp_cta_message, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING *`,
    [
      payload.slug,
      payload.title,
      payload.excerpt || null,
      payload.category || null,
      payload.category_label || null,
      payload.tag_class || "",
      payload.hero_image_url || null,
      payload.hero_image_alt || null,
      payload.body_html || "",
      payload.meta_description || null,
      payload.keywords || null,
      payload.read_time || "2 min read",
      payload.published_at || now,
      now,
      payload.is_featured ? 1 : 0,
      JSON.stringify(payload.related_slugs || []),
      payload.status || "draft",
      payload.whatsapp_cta_heading || null,
      payload.whatsapp_cta_text || null,
      payload.whatsapp_cta_message || null,
      now,
    ]
  );
  return withBlogPost(row);
}

async function updateBlogPost(id, payload) {
  await ensureReady();
  const existing = await getBlogPostById(id);
  if (!existing) {
    return null;
  }
  const merged = { ...existing, ...payload };
  await query(
    `UPDATE blog_posts SET
       slug = $1, title = $2, excerpt = $3, category = $4, category_label = $5,
       tag_class = $6, hero_image_url = $7, hero_image_alt = $8,
       body_html = $9, meta_description = $10, keywords = $11, read_time = $12,
       published_at = $13, updated_at = $14, is_featured = $15,
       related_slugs = $16, status = $17, whatsapp_cta_heading = $18,
       whatsapp_cta_text = $19, whatsapp_cta_message = $20
     WHERE id = $21`,
    [
      merged.slug,
      merged.title,
      merged.excerpt || null,
      merged.category || null,
      merged.category_label || null,
      merged.tag_class || "",
      merged.hero_image_url || null,
      merged.hero_image_alt || null,
      merged.body_html || "",
      merged.meta_description || null,
      merged.keywords || null,
      merged.read_time || "2 min read",
      merged.published_at || nowIso(),
      nowIso(),
      merged.is_featured ? 1 : 0,
      JSON.stringify(payload.related_slugs !== undefined ? payload.related_slugs : merged.related_slugs || []),
      merged.status || "draft",
      merged.whatsapp_cta_heading || null,
      merged.whatsapp_cta_text || null,
      merged.whatsapp_cta_message || null,
      id,
    ]
  );
  return getBlogPostById(id);
}

async function deleteBlogPost(id) {
  await ensureReady();
  const result = await query("DELETE FROM blog_posts WHERE id = $1", [id]);
  return result.rowCount > 0;
}

async function getSetting(key) {
  await ensureReady();
  const row = await queryOne("SELECT value FROM site_settings WHERE key = $1", [key]);
  return row ? parseJsonField(row.value, null) : null;
}

async function listSettings() {
  await ensureReady();
  const rows = await queryAll("SELECT key, value FROM site_settings");
  const settings = {};
  rows.forEach((row) => {
    settings[row.key] = parseJsonField(row.value, null);
  });
  return settings;
}

async function setSetting(key, value) {
  await ensureReady();
  await query(
    `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [key, JSON.stringify(value), nowIso()]
  );
  return getSetting(key);
}

function withScreeningSubmission(row) {
  if (!row) {
    return null;
  }
  return { ...row, answers: parseJsonField(row.answers, {}) };
}

async function createScreeningSubmission(payload) {
  await ensureReady();
  const row = await queryOne(
    `INSERT INTO screening_submissions (
      category, category_label, age_band, answers, notes, conclusion,
      contact_name, contact_phone, contact_email, patient_id, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      payload.category,
      payload.category_label || null,
      payload.age_band || null,
      JSON.stringify(payload.answers || {}),
      payload.notes || null,
      payload.conclusion,
      payload.contact_name || null,
      payload.contact_phone || null,
      payload.contact_email || null,
      payload.patient_id || null,
      nowIso(),
    ]
  );
  return withScreeningSubmission(row);
}

async function listScreeningSubmissions() {
  await ensureReady();
  const rows = await queryAll("SELECT * FROM screening_submissions ORDER BY created_at DESC, id DESC");
  return rows.map(withScreeningSubmission);
}

async function updateScreeningSubmissionReviewed(id, isReviewed) {
  await ensureReady();
  const result = await query("UPDATE screening_submissions SET is_reviewed = $1 WHERE id = $2", [
    isReviewed ? 1 : 0,
    id,
  ]);
  return result.rowCount > 0;
}

async function updateScreeningSubmissionContact(id, { contact_name, contact_phone, contact_email }) {
  await ensureReady();
  // Only fills in contact info that hasn't been set yet, so the id returned by the
  // initial anonymous submission can't be reused to overwrite someone else's
  // already-submitted callback details.
  const row = await queryOne(
    `UPDATE screening_submissions
     SET contact_name = $1, contact_phone = $2, contact_email = $3
     WHERE id = $4 AND contact_phone IS NULL
     RETURNING *`,
    [contact_name || null, contact_phone || null, contact_email || null, id]
  );
  return withScreeningSubmission(row);
}

async function deleteScreeningSubmission(id) {
  await ensureReady();
  const result = await query("DELETE FROM screening_submissions WHERE id = $1", [id]);
  return result.rowCount > 0;
}

function withoutPasswordHash(patient) {
  if (!patient) {
    return null;
  }
  const { password_hash, ...safe } = patient;
  return safe;
}

async function createPatient({ name, email, phone, password }) {
  await ensureReady();
  const now = nowIso();
  const passwordHash = bcrypt.hashSync(password, 10);

  const row = await queryOne(
    `INSERT INTO patients (name, email, phone, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, email.toLowerCase(), phone || null, passwordHash, now, now]
  );

  return withoutPasswordHash(row);
}

async function getPatientByEmail(email) {
  await ensureReady();
  return queryOne("SELECT * FROM patients WHERE email = $1", [String(email || "").toLowerCase()]);
}

async function getPatientById(id) {
  await ensureReady();
  return withoutPasswordHash(await queryOne("SELECT * FROM patients WHERE id = $1", [id]));
}

async function verifyPatientPassword(email, password) {
  const patient = await getPatientByEmail(email);
  if (!patient) {
    return null;
  }
  if (!bcrypt.compareSync(password, patient.password_hash)) {
    return null;
  }
  return withoutPasswordHash(patient);
}

function withoutTherapistPasswordHash(therapist) {
  if (!therapist) {
    return null;
  }
  const { password_hash, ...safe } = therapist;
  return safe;
}

async function createTherapist({ name, email, service, password }) {
  await ensureReady();
  const now = nowIso();
  const passwordHash = bcrypt.hashSync(password, 10);

  const row = await queryOne(
    `INSERT INTO therapists (name, email, password_hash, service, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, email.toLowerCase(), passwordHash, service, now, now]
  );

  return withoutTherapistPasswordHash(row);
}

async function getTherapistByEmail(email) {
  await ensureReady();
  return queryOne("SELECT * FROM therapists WHERE email = $1", [String(email || "").toLowerCase()]);
}

async function getTherapistById(id) {
  await ensureReady();
  return withoutTherapistPasswordHash(await queryOne("SELECT * FROM therapists WHERE id = $1", [id]));
}

async function verifyTherapistPassword(email, password) {
  const therapist = await getTherapistByEmail(email);
  if (!therapist || !therapist.is_active) {
    return null;
  }
  if (!bcrypt.compareSync(password, therapist.password_hash)) {
    return null;
  }
  return withoutTherapistPasswordHash(therapist);
}

async function listTherapists() {
  await ensureReady();
  const rows = await queryAll("SELECT * FROM therapists ORDER BY name ASC");
  return rows.map(withoutTherapistPasswordHash);
}

async function updateTherapist(id, payload) {
  await ensureReady();
  const existing = await queryOne("SELECT * FROM therapists WHERE id = $1", [id]);
  if (!existing) {
    return null;
  }

  const name = payload.name !== undefined ? String(payload.name).trim() || existing.name : existing.name;
  const service = payload.service !== undefined ? String(payload.service).trim() || existing.service : existing.service;
  const is_active =
    payload.is_active !== undefined ? (payload.is_active ? 1 : 0) : existing.is_active;
  const passwordHash =
    payload.password !== undefined && payload.password
      ? bcrypt.hashSync(payload.password, 10)
      : existing.password_hash;

  const row = await queryOne(
    `UPDATE therapists SET
       name = $1, service = $2, is_active = $3, password_hash = $4, updated_at = $5
     WHERE id = $6
     RETURNING *`,
    [name, service, is_active, passwordHash, nowIso(), id]
  );

  return withoutTherapistPasswordHash(row);
}

async function deleteTherapist(id) {
  await ensureReady();
  const result = await query("DELETE FROM therapists WHERE id = $1", [id]);
  return result.rowCount > 0;
}

async function listBookingsForPatient(patientId) {
  await ensureReady();
  return queryAll("SELECT * FROM bookings WHERE patient_id = $1 ORDER BY created_at DESC, id DESC", [patientId]);
}

async function listScreeningSubmissionsForPatient(patientId) {
  await ensureReady();
  const rows = await queryAll(
    "SELECT * FROM screening_submissions WHERE patient_id = $1 ORDER BY created_at DESC, id DESC",
    [patientId]
  );
  return rows.map(withScreeningSubmission);
}

module.exports = {
  ensureReady,
  createBooking,
  getBookingByPaymentReference,
  markBookingPaymentPaid,
  markBookingPaymentFailed,
  ADVANCE_PAYMENT_AMOUNT,
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
  listUpcomingSlotsByService,
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
  createTherapist,
  getTherapistByEmail,
  getTherapistById,
  verifyTherapistPassword,
  listTherapists,
  updateTherapist,
  deleteTherapist,
};
