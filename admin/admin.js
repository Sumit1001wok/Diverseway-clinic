"use strict";

const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const adminUsernameInput = document.getElementById("admin-username");
const adminPasswordInput = document.getElementById("admin-password");
const adminUserEl = document.getElementById("admin-user");
const logoutBtn = document.getElementById("logout-btn");
const bookingsBody = document.getElementById("bookings-body");
const messagesBody = document.getElementById("messages-body");
const statsEl = document.getElementById("admin-stats");
const bookingFilters = document.getElementById("booking-filters");
const bookingSearch = document.getElementById("booking-search");
const refreshBookingsBtn = document.getElementById("refresh-bookings");
const bookingModal = document.getElementById("booking-modal");
const modalRef = document.getElementById("modal-ref");
const modalDetails = document.getElementById("modal-details");
const bookingManageForm = document.getElementById("booking-manage-form");
const modalStatus = document.getElementById("modal-status");
const modalAssigned = document.getElementById("modal-assigned");
const modalConfirmedDate = document.getElementById("modal-confirmed-date");
const modalConfirmedTime = document.getElementById("modal-confirmed-time");
const modalNotes = document.getElementById("modal-notes");
const modalQuickActions = document.getElementById("modal-quick-actions");
const modalDeleteBtn = document.getElementById("modal-delete");
const modalError = document.getElementById("modal-error");
const availabilityService = document.getElementById("availability-service");
const availabilityDate = document.getElementById("availability-date");
const availabilityTime = document.getElementById("availability-time");
const availabilitySlots = document.getElementById("availability-slots");
const availabilityError = document.getElementById("availability-error");
const addAvailabilitySlotBtn = document.getElementById("add-availability-slot");
const addStandardHoursBtn = document.getElementById("add-standard-hours");
const refreshAvailabilityBtn = document.getElementById("refresh-availability");
const contentModal = document.getElementById("content-modal");
const contentModalTitle = document.getElementById("content-modal-title");
const contentModalEyebrow = document.getElementById("content-modal-eyebrow");
const contentModalFields = document.getElementById("content-modal-fields");
const contentManageForm = document.getElementById("content-manage-form");
const contentModalDeleteBtn = document.getElementById("content-modal-delete");
const contentModalError = document.getElementById("content-modal-error");
const settingsForm = document.getElementById("settings-form");
const settingsError = document.getElementById("settings-error");
const settingsSuccess = document.getElementById("settings-success");
const refreshScreeningsBtn = document.getElementById("refresh-screenings");
const screeningModal = document.getElementById("screening-modal");
const screeningModalEyebrow = document.getElementById("screening-modal-eyebrow");
const screeningModalDetails = document.getElementById("screening-modal-details");
const screeningModalDeleteBtn = document.getElementById("screening-modal-delete");
const therapistForm = document.getElementById("therapist-form");
const therapistNameInput = document.getElementById("therapist-name");
const therapistEmailInput = document.getElementById("therapist-email");
const therapistServiceSelect = document.getElementById("therapist-service");
const therapistPasswordInput = document.getElementById("therapist-password");
const therapistFormError = document.getElementById("therapist-form-error");
const therapistsBody = document.getElementById("therapists-body");
const refreshTherapistsBtn = document.getElementById("refresh-therapists");
const attendanceAdminBody = document.getElementById("attendance-admin-body");
const refreshAttendanceBtn = document.getElementById("refresh-attendance");
const attendanceModal = document.getElementById("attendance-modal");
const attendanceModalEyebrow = document.getElementById("attendance-modal-eyebrow");
const attendanceManageForm = document.getElementById("attendance-manage-form");
const attendanceModalDate = document.getElementById("attendance-modal-date");
const attendanceModalCheckin = document.getElementById("attendance-modal-checkin");
const attendanceModalCheckout = document.getElementById("attendance-modal-checkout");
const attendanceModalError = document.getElementById("attendance-modal-error");
const assessmentsAdminBody = document.getElementById("assessments-admin-body");
const refreshAssessmentsAdminBtn = document.getElementById("refresh-assessments-admin");

const WHATSAPP_PHONE = "9779845366417";
// STATUS_LABELS, TIER_LABELS, escapeHtml, formatDate, statusBadge, and
// apiFetch come from ../js/dashboard-utils.js, loaded before this file.

let allBookings = [];
let allMessages = [];
let activeStatusFilter = "all";
let activeBookingId = null;
let searchTimer = null;
let availabilityRows = [];
const contentData = { services: [], team: [], testimonials: [], blog: [] };
let activeContentEntity = null;
let activeContentId = null;
let allScreenings = [];
let allTherapists = [];
let allAttendance = [];
let allAssessmentsAdmin = [];
let activeAttendanceId = null;
let activeScreeningId = null;

function formatShortDate(value) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString();
}

function visitLabel(value) {
  return value === "follow_up" ? "Follow-up" : "First visit";
}

function filterBookings() {
  const query = (bookingSearch?.value || "").trim().toLowerCase();

  return allBookings.filter((row) => {
    if (activeStatusFilter !== "all" && row.status !== activeStatusFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      row.reference,
      row.name,
      row.phone,
      row.email,
      row.patient_name,
      row.service,
      row.assigned_to,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function renderStats(bookings, messages) {
  const pending = bookings.filter((b) => b.status === "pending").length;
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const unread = messages.filter((m) => !m.is_read).length;

  statsEl.innerHTML = `
    <article class="stat-item"><h3>${bookings.length}</h3><p>Total bookings</p></article>
    <article class="stat-item"><h3>${pending}</h3><p>Pending</p></article>
    <article class="stat-item"><h3>${confirmed}</h3><p>Confirmed</p></article>
    <article class="stat-item"><h3>${unread}</h3><p>Unread messages</p></article>
  `;
}

const PAYMENT_STATUS_LABELS = {
  pending: "⏳ Awaiting payment",
  paid: "✅ Paid",
  failed: "❌ Failed",
  expired: "⌛ Expired",
};

function paymentBadge(row) {
  const label = PAYMENT_STATUS_LABELS[row.payment_status] || row.payment_status || "—";
  const amount = row.payment_amount ? ` (Rs ${row.payment_amount})` : "";
  return `${escapeHtml(label)}${escapeHtml(amount)}`;
}

function renderBookings(rows) {
  if (rows.length === 0) {
    bookingsBody.innerHTML = `<tr><td colspan="10" class="empty">No bookings match your filters.</td></tr>`;
    return;
  }

  bookingsBody.innerHTML = rows
    .map(
      (row) => `
    <tr class="booking-row${row.status === "pending" ? " is-pending" : ""}">
      <td><code>${escapeHtml(row.reference || `#${row.id}`)}</code></td>
      <td>${formatDate(row.created_at)}</td>
      <td>
        <strong>${escapeHtml(row.name)}</strong><br>
        <a href="tel:${escapeHtml(row.phone)}">${escapeHtml(row.phone)}</a>
        ${row.email ? `<br><span class="muted">${escapeHtml(row.email)}</span>` : ""}
      </td>
      <td>
        ${escapeHtml(row.patient_name || "—")}
        ${row.patient_age ? `<br><span class="muted">${escapeHtml(row.patient_age)}</span>` : ""}
      </td>
      <td>${escapeHtml(row.service)}<br><span class="muted">${visitLabel(row.visit_type)} · ${row.duration_minutes || "—"} min</span></td>
      <td>${escapeHtml([formatShortDate(row.preferred_date), row.preferred_time].filter(Boolean).join(" ") || "—")}</td>
      <td>${statusBadge(row.status)}</td>
      <td>${paymentBadge(row)}</td>
      <td>${escapeHtml(row.assigned_to || "—")}</td>
      <td>
        <button type="button" class="btn-outline btn-sm" data-manage-id="${row.id}">Manage</button>
      </td>
    </tr>`
    )
    .join("");

  bookingsBody.querySelectorAll("[data-manage-id]").forEach((btn) => {
    btn.addEventListener("click", () => openBookingModal(Number(btn.dataset.manageId)));
  });
}

function renderMessages(rows) {
  if (rows.length === 0) {
    messagesBody.innerHTML = `<tr><td colspan="6" class="empty">No messages yet.</td></tr>`;
    return;
  }

  messagesBody.innerHTML = rows
    .map(
      (row) => `
    <tr class="${row.is_read ? "" : "is-unread"}">
      <td>${formatDate(row.created_at)}</td>
      <td>${escapeHtml(row.name || "—")}</td>
      <td>${escapeHtml(row.email || "—")}</td>
      <td>${escapeHtml(row.subject)}</td>
      <td class="msg-cell">${escapeHtml(row.message)}</td>
      <td>
        <button type="button" class="btn-outline btn-sm" data-message-id="${row.id}" data-read="${row.is_read ? "1" : "0"}">
          ${row.is_read ? "Mark unread" : "Mark read"}
        </button>
      </td>
    </tr>`
    )
    .join("");

  messagesBody.querySelectorAll("[data-message-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.messageId;
      const isRead = btn.dataset.read === "1";
      try {
        await apiFetch(`/api/admin/messages/${id}/read`, {
          method: "PATCH",
          body: JSON.stringify({ is_read: !isRead }),
        });
        await loadDashboard();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function renderBookingTable() {
  renderBookings(filterBookings());
}

function buildWhatsAppLink(booking) {
  const lines = [
    `Hello ${booking.name}, this is Diverse Way Clinic regarding your booking ${booking.reference || ""}.`,
    `Service: ${booking.service}`,
    booking.confirmed_date
      ? `Confirmed: ${booking.confirmed_date}${booking.confirmed_time ? ` at ${booking.confirmed_time}` : ""}`
      : `Preferred: ${booking.preferred_date || "TBD"}${booking.preferred_time ? ` at ${booking.preferred_time}` : ""}`,
    `Status: ${STATUS_LABELS[booking.status] || booking.status}`,
  ];
  const phone = String(booking.phone || "").replace(/\D/g, "");
  const waPhone = phone.startsWith("977") ? phone : `977${phone.replace(/^0/, "")}`;
  return `https://wa.me/${waPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function openBookingModal(id) {
  const booking = allBookings.find((row) => row.id === id);
  if (!booking) {
    return;
  }

  activeBookingId = id;
  modalError.textContent = "";
  modalRef.textContent = booking.reference || `#${booking.id}`;
  modalStatus.value = booking.status || "pending";
  modalAssigned.value = booking.assigned_to || "";
  modalConfirmedDate.value = booking.confirmed_date || booking.preferred_date || "";
  modalConfirmedTime.value = booking.confirmed_time || booking.preferred_time || "";
  modalNotes.value = booking.admin_notes || "";

  modalDetails.innerHTML = `
    <div class="detail-item"><span>Submitted</span><strong>${formatDate(booking.created_at)}</strong></div>
    <div class="detail-item"><span>Contact</span><strong>${escapeHtml(booking.name)}</strong><br>${escapeHtml(booking.phone)}${booking.email ? `<br>${escapeHtml(booking.email)}` : ""}</div>
    <div class="detail-item"><span>Patient</span><strong>${escapeHtml(booking.patient_name || "—")}</strong>${booking.patient_age ? `<br>${escapeHtml(booking.patient_age)}` : ""}</div>
    <div class="detail-item"><span>Service</span><strong>${escapeHtml(booking.service)}</strong><br>${visitLabel(booking.visit_type)} · ${booking.duration_minutes || "—"} min</div>
    <div class="detail-item"><span>Preferred slot</span><strong>${escapeHtml([formatShortDate(booking.preferred_date), booking.preferred_time].filter(Boolean).join(" ") || "Not specified")}</strong></div>
    <div class="detail-item"><span>Advance payment</span><strong>${paymentBadge(booking)}</strong></div>
    <div class="detail-item detail-full"><span>Client message</span><p>${escapeHtml(booking.message || "—")}</p></div>
  `;

  modalQuickActions.innerHTML = `
    <a class="btn-outline btn-sm" href="tel:${escapeHtml(booking.phone)}">Call</a>
    <a class="btn-outline btn-sm" href="${buildWhatsAppLink(booking)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
  `;

  bookingModal.classList.remove("hidden");
  bookingModal.setAttribute("aria-hidden", "false");
}

function closeBookingModal() {
  activeBookingId = null;
  bookingModal.classList.add("hidden");
  bookingModal.setAttribute("aria-hidden", "true");
}

function renderAvailabilitySlots(rows) {
  if (!availabilitySlots) {
    return;
  }

  const serviceLabel = availabilityService?.value || "this therapy";

  if (rows.length === 0) {
    availabilitySlots.innerHTML = `<p class="empty slot-empty">No times set for ${escapeHtml(serviceLabel)} on this date yet. Add clinic hours or individual times above.</p>`;
    return;
  }

  availabilitySlots.innerHTML = rows
    .map((slot) => {
      let stateClass = "is-closed";
      let stateLabel = "Closed";
      let meta = "Not open for booking";

      if (slot.is_booked) {
        stateClass = "is-booked";
        stateLabel = "Booked";
        const duration = slot.booking_duration_minutes ? `${slot.booking_duration_minutes} min` : "";
        const service = slot.booking_service ? ` · ${slot.booking_service}` : "";
        meta = `${slot.booking_reference || "Booking"} · ${slot.booking_name || "Patient"}${service}${duration ? ` · ${duration}` : ""}`;
      } else if (slot.is_available) {
        stateClass = "is-open";
        stateLabel = "Available";
        meta = `Open for ${slot.service || serviceLabel} bookings`;
      }

      const actions = slot.is_booked
        ? ""
        : `
          <button type="button" class="btn-outline btn-sm" data-slot-toggle="${slot.id}" data-open="${slot.is_available ? "1" : "0"}">
            ${slot.is_available ? "Close slot" : "Open slot"}
          </button>
          <button type="button" class="btn-danger btn-sm" data-slot-delete="${slot.id}">Remove</button>
        `;

      return `
        <article class="slot-card ${stateClass}">
          <div class="slot-card-head">
            <strong>${escapeHtml(slot.label)}</strong>
            <span class="slot-state">${stateLabel}</span>
          </div>
          <p class="slot-meta">${escapeHtml(meta)}</p>
          <div class="slot-actions">${actions}</div>
        </article>
      `;
    })
    .join("");

  availabilitySlots.querySelectorAll("[data-slot-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.slotToggle;
      const open = btn.dataset.open === "1";
      try {
        await apiFetch(`/api/admin/availability/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ is_available: !open }),
        });
        await loadAvailability();
      } catch (err) {
        availabilityError.textContent = err.message;
      }
    });
  });

  availabilitySlots.querySelectorAll("[data-slot-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!window.confirm("Remove this time slot?")) {
        return;
      }

      try {
        await apiFetch(`/api/admin/availability/${btn.dataset.slotDelete}`, {
          method: "DELETE",
        });
        await loadAvailability();
      } catch (err) {
        availabilityError.textContent = err.message;
      }
    });
  });
}

async function loadAvailability() {
  if (!availabilityDate || !availabilityService) {
    return;
  }

  availabilityError.textContent = "";

  const result = await apiFetch(
    `/api/admin/availability?date=${encodeURIComponent(availabilityDate.value)}&service=${encodeURIComponent(availabilityService.value)}`
  );

  availabilityRows = result.data;
  renderAvailabilitySlots(availabilityRows);
}

function initAvailabilityPanel() {
  if (!availabilityDate) {
    return;
  }

  availabilityDate.min = new Date().toISOString().slice(0, 10);
  availabilityDate.value = new Date().toISOString().slice(0, 10);
}

async function loadDashboard() {
  const [bookingsRes, messagesRes] = await Promise.all([
    apiFetch("/api/admin/bookings"),
    apiFetch("/api/admin/messages"),
  ]);

  allBookings = bookingsRes.data;
  allMessages = messagesRes.data;

  renderStats(allBookings, allMessages);
  renderBookingTable();
  renderMessages(allMessages);
  await loadAvailability();
  await Promise.all([
    loadAllContent(),
    loadSettings(),
    loadScreenings(),
    loadTherapists(),
    loadAttendanceAdmin(),
    loadAssessmentsAdmin(),
  ]);
}

function renderScreenings() {
  if (!allScreenings.length) {
    document.getElementById("screenings-body").innerHTML =
      '<tr><td colspan="6" class="empty">No screening submissions yet.</td></tr>';
    return;
  }

  document.getElementById("screenings-body").innerHTML = allScreenings
    .map(
      (row) => `
    <tr>
      <td>${formatDate(row.created_at)}</td>
      <td>${escapeHtml(row.category_label || row.category)}</td>
      <td>${escapeHtml(row.age_band || "—")}</td>
      <td>${TIER_LABELS[row.conclusion] || escapeHtml(row.conclusion)}</td>
      <td>${row.contact_name ? `${escapeHtml(row.contact_name)}<br>${escapeHtml(row.contact_phone || "")}` : "—"}</td>
      <td><button type="button" class="btn-outline btn-sm" data-view-screening="${row.id}">View</button></td>
    </tr>`
    )
    .join("");

  document.querySelectorAll("[data-view-screening]").forEach((btn) => {
    btn.addEventListener("click", () => openScreeningModal(Number(btn.dataset.viewScreening)));
  });
}

async function loadScreenings() {
  const res = await apiFetch("/api/admin/screening");
  allScreenings = res.data;
  renderScreenings();
}

function renderTherapists() {
  if (!allTherapists.length) {
    therapistsBody.innerHTML = '<tr><td colspan="5" class="empty">No therapists added yet.</td></tr>';
    return;
  }

  therapistsBody.innerHTML = allTherapists
    .map(
      (row) => `
    <tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.email)}</td>
      <td>${escapeHtml(row.service)}</td>
      <td>${row.is_active ? "Yes" : "No"}</td>
      <td class="therapist-row-actions">
        <button type="button" class="btn-outline btn-sm" data-reset-therapist="${row.id}">Reset password</button>
        <button type="button" class="btn-outline btn-sm" data-toggle-therapist="${row.id}">${row.is_active ? "Deactivate" : "Reactivate"}</button>
        <button type="button" class="btn-danger btn-sm" data-delete-therapist="${row.id}">Delete</button>
      </td>
    </tr>`
    )
    .join("");

  document.querySelectorAll("[data-reset-therapist]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.resetTherapist);
      const password = window.prompt("Enter a new password for this therapist (at least 8 characters):");
      if (!password) {
        return;
      }
      if (password.length < 8) {
        window.alert("Password must be at least 8 characters.");
        return;
      }
      try {
        await apiFetch(`/api/admin/therapists/${id}`, { method: "PATCH", body: JSON.stringify({ password }) });
        window.alert("Password updated.");
      } catch (err) {
        window.alert(err.message || "Could not update password.");
      }
    });
  });

  document.querySelectorAll("[data-toggle-therapist]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.toggleTherapist);
      const row = allTherapists.find((t) => t.id === id);
      if (!row) return;
      try {
        await apiFetch(`/api/admin/therapists/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: !row.is_active }),
        });
        await loadTherapists();
      } catch (err) {
        window.alert(err.message || "Could not update therapist.");
      }
    });
  });

  document.querySelectorAll("[data-delete-therapist]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!window.confirm("Delete this therapist? They will no longer be able to sign in.")) {
        return;
      }
      const id = Number(btn.dataset.deleteTherapist);
      try {
        await apiFetch(`/api/admin/therapists/${id}`, { method: "DELETE" });
        await loadTherapists();
      } catch (err) {
        window.alert(err.message || "Could not delete therapist.");
      }
    });
  });
}

async function loadTherapists() {
  const res = await apiFetch("/api/admin/therapists");
  allTherapists = res.data;
  renderTherapists();
}

therapistForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  therapistFormError.textContent = "";

  try {
    await apiFetch("/api/admin/therapists", {
      method: "POST",
      body: JSON.stringify({
        name: therapistNameInput.value.trim(),
        email: therapistEmailInput.value.trim(),
        service: therapistServiceSelect.value,
        password: therapistPasswordInput.value,
      }),
    });
    therapistForm.reset();
    await loadTherapists();
  } catch (err) {
    therapistFormError.textContent = err.message || "Could not add therapist.";
  }
});

refreshTherapistsBtn?.addEventListener("click", loadTherapists);

function timeOnly(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return escapeHtml(value);
  return escapeHtml(d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }));
}

function renderAttendanceAdmin() {
  if (!allAttendance.length) {
    attendanceAdminBody.innerHTML = '<tr><td colspan="5" class="empty">No attendance recorded yet.</td></tr>';
    return;
  }

  attendanceAdminBody.innerHTML = allAttendance
    .map(
      (row) => `
    <tr>
      <td>${escapeHtml(row.therapist_name)}<br><span class="muted">${escapeHtml(row.therapist_service)}</span></td>
      <td>${escapeHtml(row.date)}</td>
      <td>${timeOnly(row.check_in_time)}</td>
      <td>${timeOnly(row.check_out_time)}</td>
      <td><button type="button" class="btn-outline btn-sm" data-edit-attendance="${row.id}">Edit</button></td>
    </tr>`
    )
    .join("");

  document.querySelectorAll("[data-edit-attendance]").forEach((btn) => {
    btn.addEventListener("click", () => openAttendanceModal(Number(btn.dataset.editAttendance)));
  });
}

async function loadAttendanceAdmin() {
  const res = await apiFetch("/api/admin/attendance");
  allAttendance = res.data;
  renderAttendanceAdmin();
}

function toTimeInputValue(isoValue) {
  if (!isoValue) return "";
  const d = new Date(isoValue);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function openAttendanceModal(id) {
  const row = allAttendance.find((r) => r.id === id);
  if (!row) {
    return;
  }

  activeAttendanceId = id;
  attendanceModalEyebrow.textContent = `${row.therapist_name} · ${row.therapist_service}`;
  attendanceModalDate.value = row.date;
  attendanceModalCheckin.value = toTimeInputValue(row.check_in_time);
  attendanceModalCheckout.value = toTimeInputValue(row.check_out_time);
  attendanceModalError.textContent = "";

  attendanceModal.classList.remove("hidden");
  attendanceModal.setAttribute("aria-hidden", "false");
}

function closeAttendanceModal() {
  attendanceModal.classList.add("hidden");
  attendanceModal.setAttribute("aria-hidden", "true");
  activeAttendanceId = null;
}

function combineDateAndTime(dateStr, timeStr) {
  if (!timeStr) {
    return null;
  }
  const d = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString();
}

attendanceManageForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeAttendanceId) {
    return;
  }
  attendanceModalError.textContent = "";

  const date = attendanceModalDate.value;
  try {
    await apiFetch(`/api/admin/attendance/${activeAttendanceId}`, {
      method: "PATCH",
      body: JSON.stringify({
        date,
        check_in_time: combineDateAndTime(date, attendanceModalCheckin.value),
        check_out_time: combineDateAndTime(date, attendanceModalCheckout.value),
      }),
    });
    closeAttendanceModal();
    await loadAttendanceAdmin();
  } catch (err) {
    attendanceModalError.textContent = err.message || "Could not save changes.";
  }
});

attendanceModal?.querySelectorAll("[data-close-attendance-modal]").forEach((el) => {
  el.addEventListener("click", closeAttendanceModal);
});

refreshAttendanceBtn?.addEventListener("click", loadAttendanceAdmin);

function renderAssessmentsAdmin() {
  if (!allAssessmentsAdmin.length) {
    assessmentsAdminBody.innerHTML = '<tr><td colspan="5" class="empty">No assessments written yet.</td></tr>';
    return;
  }

  assessmentsAdminBody.innerHTML = allAssessmentsAdmin
    .map(
      (a) => `
    <tr>
      <td>${escapeHtml(a.client_name)}</td>
      <td>${escapeHtml(a.therapist_name)}<br><span class="muted">${escapeHtml(a.therapist_service)}</span></td>
      <td>${escapeHtml(a.assessment_date || "—")}</td>
      <td>${formatDate(a.updated_at || a.created_at)}</td>
      <td class="therapist-row-actions">
        <button type="button" class="btn-outline btn-sm" data-print-assessment-admin="${a.id}">Print form</button>
        ${a.report ? `<button type="button" class="btn-outline btn-sm" data-print-report-admin="${a.id}">View report</button>` : ""}
      </td>
    </tr>`
    )
    .join("");

  document.querySelectorAll("[data-print-assessment-admin]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.open(`../therapist/assessment-print.html?id=${btn.dataset.printAssessmentAdmin}&role=admin`, "_blank");
    });
  });

  document.querySelectorAll("[data-print-report-admin]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.open(`../therapist/report-print.html?id=${btn.dataset.printReportAdmin}&role=admin`, "_blank");
    });
  });
}

async function loadAssessmentsAdmin() {
  const res = await apiFetch("/api/admin/assessments");
  allAssessmentsAdmin = res.data;
  renderAssessmentsAdmin();
}

refreshAssessmentsAdminBtn?.addEventListener("click", loadAssessmentsAdmin);

function openScreeningModal(id) {
  const row = allScreenings.find((r) => r.id === id);
  if (!row) {
    return;
  }

  activeScreeningId = id;
  screeningModalEyebrow.textContent = (row.category_label || row.category).toUpperCase();
  document.getElementById("screening-modal-title").textContent = TIER_LABELS[row.conclusion] || row.conclusion;

  const answerRows = Object.entries(row.answers || {})
    .map(([key, value]) => `<div class="detail-item"><span>${escapeHtml(key)}</span><strong>${escapeHtml(String(value))}</strong></div>`)
    .join("");

  screeningModalDetails.innerHTML = `
    <div class="detail-item"><span>Submitted</span><strong>${formatDate(row.created_at)}</strong></div>
    <div class="detail-item"><span>Age band</span><strong>${escapeHtml(row.age_band || "—")}</strong></div>
    <div class="detail-item"><span>Contact</span><strong>${escapeHtml(row.contact_name || "—")}</strong>${row.contact_phone ? `<br>${escapeHtml(row.contact_phone)}` : ""}${row.contact_email ? `<br>${escapeHtml(row.contact_email)}` : ""}</div>
    <div class="detail-item detail-full"><span>Notes</span><p>${escapeHtml(row.notes || "—")}</p></div>
    ${answerRows}
  `;

  screeningModal.classList.remove("hidden");
  screeningModal.setAttribute("aria-hidden", "false");
}

function closeScreeningModal() {
  screeningModal.classList.add("hidden");
  screeningModal.setAttribute("aria-hidden", "true");
  activeScreeningId = null;
}

screeningModal?.querySelectorAll("[data-close-screening-modal]").forEach((el) => {
  el.addEventListener("click", closeScreeningModal);
});

screeningModalDeleteBtn?.addEventListener("click", async () => {
  if (!activeScreeningId) {
    return;
  }
  if (!window.confirm("Delete this screening submission? This cannot be undone.")) {
    return;
  }
  try {
    await apiFetch(`/api/admin/screening/${activeScreeningId}`, { method: "DELETE" });
    closeScreeningModal();
    await loadScreenings();
  } catch (err) {
    alert(err.message);
  }
});

refreshScreeningsBtn?.addEventListener("click", async () => {
  try {
    await loadScreenings();
  } catch (err) {
    alert(err.message);
  }
});

const CONTENT_ENTITIES = {
  services: {
    apiPath: "/api/admin/services",
    label: "service",
    columns: [
      { render: (row) => escapeHtml(row.name) },
      { render: (row) => row.sort_order },
      { render: (row) => (row.is_active ? "Yes" : "No") },
    ],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "slug", label: "Slug (auto from name if blank)", type: "text" },
      { key: "short_description", label: "Short description (homepage card)", type: "textarea" },
      { key: "description", label: "Full description (services page)", type: "textarea" },
      { key: "photo_url", label: "Photo path", type: "text" },
      { key: "icon_path", label: "Card icon (SVG path data)", type: "text" },
      { key: "detail_icon_path", label: "Detail icon (SVG path data)", type: "text" },
      { key: "accent_class", label: "Accent class", type: "text" },
      { key: "treat_list", label: "What we treat (one per line)", type: "list" },
      { key: "whatsapp_message", label: "WhatsApp message", type: "text" },
      { key: "sort_order", label: "Sort order", type: "number", default: 0 },
      { key: "is_active", label: "Active", type: "checkbox", default: true },
    ],
  },
  team: {
    apiPath: "/api/admin/team",
    label: "team member",
    columns: [
      { render: (row) => escapeHtml(row.name) },
      { render: (row) => escapeHtml(row.title || "") },
      { render: (row) => row.sort_order },
      { render: (row) => (row.is_active ? "Yes" : "No") },
    ],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "title", label: "Title", type: "text" },
      { key: "bio", label: "Full bio (About page)", type: "textarea" },
      { key: "bio_short", label: "Short bio (homepage card)", type: "textarea" },
      { key: "photo_url", label: "Photo path (blank = no-photo card)", type: "text" },
      { key: "whatsapp_message", label: "WhatsApp message", type: "text" },
      { key: "sort_order", label: "Sort order", type: "number", default: 0 },
      { key: "is_active", label: "Active", type: "checkbox", default: true },
    ],
  },
  testimonials: {
    apiPath: "/api/admin/testimonials",
    label: "testimonial",
    columns: [
      { render: (row) => escapeHtml(row.attribution) },
      { render: (row) => row.stars },
      { render: (row) => row.sort_order },
      { render: (row) => (row.is_active ? "Yes" : "No") },
    ],
    fields: [
      { key: "attribution", label: "Attribution", type: "text", required: true },
      { key: "quote", label: "Quote", type: "textarea", required: true },
      { key: "avatar_url", label: "Avatar photo path", type: "text" },
      { key: "stars", label: "Stars (1-5)", type: "number", default: 5 },
      { key: "sort_order", label: "Sort order", type: "number", default: 0 },
      { key: "is_active", label: "Active", type: "checkbox", default: true },
    ],
  },
  blog: {
    apiPath: "/api/admin/blog",
    label: "post",
    columns: [
      { render: (row) => escapeHtml(row.title) },
      { render: (row) => escapeHtml(row.category_label || "") },
      { render: (row) => formatShortDate(row.published_at) },
      { render: (row) => escapeHtml(row.status) },
      { render: (row) => (row.is_featured ? "Yes" : "No") },
    ],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "slug", label: "Slug (auto from title if blank)", type: "text" },
      { key: "excerpt", label: "Excerpt", type: "textarea" },
      { key: "category", label: "Category key (e.g. speech)", type: "text" },
      { key: "category_label", label: "Category label (e.g. Speech Therapy)", type: "text" },
      { key: "tag_class", label: "Tag CSS modifier (e.g. blog-tag--behaviour)", type: "text" },
      { key: "hero_image_url", label: "Hero image path", type: "text" },
      { key: "hero_image_alt", label: "Hero image alt text", type: "text" },
      { key: "body_html", label: "Body (HTML)", type: "textarea-large", required: true },
      { key: "meta_description", label: "Meta description", type: "textarea" },
      { key: "keywords", label: "Keywords (comma separated)", type: "text" },
      { key: "read_time", label: "Read time", type: "text", default: "2 min read" },
      { key: "published_at", label: "Published date", type: "date" },
      { key: "related_slugs", label: "Related post slugs (one per line)", type: "list" },
      { key: "whatsapp_cta_heading", label: "WhatsApp CTA heading", type: "text" },
      { key: "whatsapp_cta_text", label: "WhatsApp CTA subtext", type: "text" },
      { key: "whatsapp_cta_message", label: "WhatsApp CTA message", type: "text" },
      { key: "is_featured", label: "Featured on blog listing", type: "checkbox" },
      {
        key: "status",
        label: "Status",
        type: "select",
        default: "draft",
        options: [
          ["draft", "Draft"],
          ["published", "Published"],
        ],
      },
    ],
  },
};

function contentFieldHtml(field, value) {
  const id = `content-field-${field.key}`;

  if (field.type === "textarea" || field.type === "textarea-large") {
    const rows = field.type === "textarea-large" ? 10 : 3;
    return `<label class="field field-full"><span>${field.label}</span><textarea id="${id}" name="${field.key}" rows="${rows}">${escapeHtml(value || "")}</textarea></label>`;
  }

  if (field.type === "list") {
    const text = Array.isArray(value) ? value.join("\n") : "";
    return `<label class="field field-full"><span>${field.label}</span><textarea id="${id}" name="${field.key}" rows="4">${escapeHtml(text)}</textarea></label>`;
  }

  if (field.type === "checkbox") {
    return `<label class="field field-checkbox"><span>${field.label}</span><input type="checkbox" id="${id}" name="${field.key}" ${value ? "checked" : ""}></label>`;
  }

  if (field.type === "select") {
    const options = field.options
      .map(([val, label]) => `<option value="${val}" ${value === val ? "selected" : ""}>${label}</option>`)
      .join("");
    return `<label class="field"><span>${field.label}</span><select id="${id}" name="${field.key}">${options}</select></label>`;
  }

  if (field.type === "number") {
    return `<label class="field"><span>${field.label}</span><input type="number" id="${id}" name="${field.key}" value="${value ?? ""}"></label>`;
  }

  if (field.type === "date") {
    return `<label class="field"><span>${field.label}</span><input type="date" id="${id}" name="${field.key}" value="${value || ""}"></label>`;
  }

  return `<label class="field"><span>${field.label}</span><input type="text" id="${id}" name="${field.key}" value="${escapeHtml(value || "")}"></label>`;
}

function renderContentTable(entityKey) {
  const config = CONTENT_ENTITIES[entityKey];
  const tbody = document.getElementById(`${entityKey}-body`);
  if (!tbody) {
    return;
  }

  const rows = contentData[entityKey] || [];

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${config.columns.length + 1}" class="empty">No ${config.label}s yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (row) => `
    <tr>
      ${config.columns.map((col) => `<td>${col.render(row)}</td>`).join("")}
      <td><button type="button" class="btn-outline btn-sm" data-edit-content="${entityKey}" data-id="${row.id}">Edit</button></td>
    </tr>`
    )
    .join("");
}

async function loadContentEntity(entityKey) {
  const config = CONTENT_ENTITIES[entityKey];
  const res = await apiFetch(config.apiPath);
  contentData[entityKey] = res.data;
  renderContentTable(entityKey);
}

async function loadAllContent() {
  await Promise.all(Object.keys(CONTENT_ENTITIES).map((key) => loadContentEntity(key)));
}

function openContentModal(entityKey, id) {
  const config = CONTENT_ENTITIES[entityKey];
  const row = id ? (contentData[entityKey] || []).find((r) => r.id === id) : null;

  activeContentEntity = entityKey;
  activeContentId = id || null;

  contentModalTitle.textContent = id ? `Edit ${config.label}` : `Add ${config.label}`;
  contentModalEyebrow.textContent = config.label.toUpperCase();
  contentModalFields.innerHTML = config.fields
    .map((field) => contentFieldHtml(field, row ? row[field.key] : field.default))
    .join("");
  contentModalDeleteBtn.classList.toggle("hidden", !id);
  contentModalError.textContent = "";
  contentModal.classList.remove("hidden");
  contentModal.setAttribute("aria-hidden", "false");
}

function closeContentModal() {
  contentModal.classList.add("hidden");
  contentModal.setAttribute("aria-hidden", "true");
  activeContentEntity = null;
  activeContentId = null;
}

function readContentForm() {
  const config = CONTENT_ENTITIES[activeContentEntity];
  const payload = {};

  config.fields.forEach((field) => {
    const el = document.getElementById(`content-field-${field.key}`);
    if (!el) {
      return;
    }

    if (field.type === "checkbox") {
      payload[field.key] = el.checked;
    } else if (field.type === "list") {
      payload[field.key] = el.value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    } else if (field.type === "number") {
      payload[field.key] = el.value === "" ? 0 : Number(el.value);
    } else {
      payload[field.key] = el.value.trim();
    }
  });

  return payload;
}

document.addEventListener("click", (event) => {
  const addBtn = event.target.closest("[data-add-content]");
  if (addBtn) {
    openContentModal(addBtn.dataset.addContent, null);
    return;
  }

  const editBtn = event.target.closest("[data-edit-content]");
  if (editBtn) {
    openContentModal(editBtn.dataset.editContent, Number(editBtn.dataset.id));
  }
});

contentModal?.querySelectorAll("[data-close-content-modal]").forEach((el) => {
  el.addEventListener("click", closeContentModal);
});

contentManageForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeContentEntity) {
    return;
  }

  const config = CONTENT_ENTITIES[activeContentEntity];
  contentModalError.textContent = "";

  try {
    const payload = readContentForm();
    if (activeContentId) {
      await apiFetch(`${config.apiPath}/${activeContentId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch(config.apiPath, { method: "POST", body: JSON.stringify(payload) });
    }

    await loadContentEntity(activeContentEntity);
    closeContentModal();
  } catch (err) {
    contentModalError.textContent = err.message;
  }
});

contentModalDeleteBtn?.addEventListener("click", async () => {
  if (!activeContentEntity || !activeContentId) {
    return;
  }

  const config = CONTENT_ENTITIES[activeContentEntity];
  if (!window.confirm(`Delete this ${config.label}? This cannot be undone.`)) {
    return;
  }

  try {
    await apiFetch(`${config.apiPath}/${activeContentId}`, { method: "DELETE" });
    await loadContentEntity(activeContentEntity);
    closeContentModal();
  } catch (err) {
    contentModalError.textContent = err.message;
  }
});

async function loadSettings() {
  const res = await apiFetch("/api/admin/settings");
  const hours = res.data.clinic_hours || {};
  const weekdayLabel = document.getElementById("settings-weekday-label");
  const weekdayHours = document.getElementById("settings-weekday-hours");
  const weekendLabel = document.getElementById("settings-weekend-label");
  const weekendHours = document.getElementById("settings-weekend-hours");

  if (weekdayLabel) weekdayLabel.value = hours.weekday_label || "";
  if (weekdayHours) weekdayHours.value = hours.weekday_hours || "";
  if (weekendLabel) weekendLabel.value = hours.weekend_label || "";
  if (weekendHours) weekendHours.value = hours.weekend_hours || "";
}

settingsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  settingsError.textContent = "";
  settingsSuccess.hidden = true;

  try {
    const value = {
      weekday_label: document.getElementById("settings-weekday-label").value.trim(),
      weekday_hours: document.getElementById("settings-weekday-hours").value.trim(),
      weekend_label: document.getElementById("settings-weekend-label").value.trim(),
      weekend_hours: document.getElementById("settings-weekend-hours").value.trim(),
    };

    await apiFetch("/api/admin/settings/clinic_hours", {
      method: "PATCH",
      body: JSON.stringify({ value }),
    });

    settingsSuccess.hidden = false;
    settingsSuccess.textContent = "Saved.";
  } catch (err) {
    settingsError.textContent = err.message;
  }
});

function showDashboard(username) {
  if (adminUserEl && username) {
    adminUserEl.textContent = username;
  }
  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
  logoutBtn?.classList.remove("hidden");
  document.querySelector(".admin-site-header")?.classList.add("is-scrolled");
}

function showLogin() {
  dashboard.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  logoutBtn?.classList.add("hidden");
  closeBookingModal();
  closeContentModal();
  closeScreeningModal();
  closeAttendanceModal();
}

bookingFilters?.addEventListener("click", (event) => {
  const tab = event.target.closest(".filter-tab");
  if (!tab) {
    return;
  }

  activeStatusFilter = tab.dataset.status || "all";
  bookingFilters.querySelectorAll(".filter-tab").forEach((el) => {
    el.classList.toggle("is-active", el === tab);
  });
  renderBookingTable();
});

bookingSearch?.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderBookingTable, 180);
});

refreshBookingsBtn?.addEventListener("click", async () => {
  try {
    await loadDashboard();
  } catch (err) {
    alert(err.message);
  }
});

availabilityDate?.addEventListener("change", async () => {
  try {
    await loadAvailability();
  } catch (err) {
    availabilityError.textContent = err.message;
  }
});

availabilityService?.addEventListener("change", async () => {
  try {
    await loadAvailability();
  } catch (err) {
    availabilityError.textContent = err.message;
  }
});

refreshAvailabilityBtn?.addEventListener("click", async () => {
  try {
    await loadAvailability();
  } catch (err) {
    availabilityError.textContent = err.message;
  }
});

addAvailabilitySlotBtn?.addEventListener("click", async () => {
  if (!availabilityDate?.value || !availabilityTime?.value) {
    availabilityError.textContent = "Choose a date and time to add.";
    return;
  }

  try {
    await apiFetch("/api/admin/availability", {
      method: "POST",
      body: JSON.stringify({
        date: availabilityDate.value,
        time: availabilityTime.value,
        service: availabilityService.value,
      }),
    });
    availabilityTime.value = "";
    availabilityError.textContent = "";
    await loadAvailability();
  } catch (err) {
    availabilityError.textContent = err.message;
  }
});

addStandardHoursBtn?.addEventListener("click", async () => {
  if (!availabilityDate?.value) {
    availabilityError.textContent = "Choose a date first.";
    return;
  }

  try {
    await apiFetch("/api/admin/availability/standard", {
      method: "POST",
      body: JSON.stringify({ date: availabilityDate.value, service: availabilityService.value }),
    });
    availabilityError.textContent = "";
    await loadAvailability();
  } catch (err) {
    availabilityError.textContent = err.message;
  }
});

bookingManageForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeBookingId) {
    return;
  }

  modalError.textContent = "";

  try {
    await apiFetch(`/api/admin/bookings/${activeBookingId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: modalStatus.value,
        assigned_to: modalAssigned.value,
        confirmed_date: modalConfirmedDate.value,
        confirmed_time: modalConfirmedTime.value,
        admin_notes: modalNotes.value.trim(),
      }),
    });

    await loadDashboard();
    openBookingModal(activeBookingId);
  } catch (err) {
    modalError.textContent = err.message;
  }
});

modalDeleteBtn?.addEventListener("click", async () => {
  if (!activeBookingId) {
    return;
  }

  const booking = allBookings.find((row) => row.id === activeBookingId);
  const label = booking?.reference || `#${activeBookingId}`;

  if (!window.confirm(`Delete booking ${label}? This cannot be undone.`)) {
    return;
  }

  try {
    await apiFetch(`/api/admin/bookings/${activeBookingId}`, { method: "DELETE" });
    closeBookingModal();
    await loadDashboard();
  } catch (err) {
    modalError.textContent = err.message;
  }
});

bookingModal?.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", closeBookingModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (!bookingModal.classList.contains("hidden")) {
    closeBookingModal();
  }
  if (!contentModal.classList.contains("hidden")) {
    closeContentModal();
  }
  if (!screeningModal.classList.contains("hidden")) {
    closeScreeningModal();
  }
  if (!attendanceModal.classList.contains("hidden")) {
    closeAttendanceModal();
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

  try {
    const result = await apiFetch("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        username: adminUsernameInput.value.trim(),
        password: adminPasswordInput.value,
      }),
    });

    await loadDashboard();
    showDashboard(result.user?.username || "admin");
  } catch {
    loginError.textContent = "Invalid username or password.";
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await apiFetch("/api/admin/logout", { method: "POST" });
  } catch {
    // Still show login screen locally if logout request fails.
  }

  adminPasswordInput.value = "";
  showLogin();
});

async function bootstrap() {
  initAvailabilityPanel();

  try {
    const session = await apiFetch("/api/admin/session");
    if (session.authenticated) {
      await loadDashboard();
      showDashboard(session.user?.username || "admin");
      return;
    }
  } catch {
    // Not signed in.
  }

  showLogin();
}

bootstrap();
