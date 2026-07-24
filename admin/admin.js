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
const availabilityDate = document.getElementById("availability-date");
const availabilityTime = document.getElementById("availability-time");
const availabilitySlots = document.getElementById("availability-slots");
const availabilityError = document.getElementById("availability-error");
const addAvailabilitySlotBtn = document.getElementById("add-availability-slot");
const addStandardHoursBtn = document.getElementById("add-standard-hours");
const refreshAvailabilityBtn = document.getElementById("refresh-availability");

const WHATSAPP_PHONE = "9779845366417";
const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

let allBookings = [];
let allMessages = [];
let activeStatusFilter = "all";
let activeBookingId = null;
let searchTimer = null;
let availabilityRows = [];

const fetchOptions = {
  credentials: "same-origin",
  headers: {
    "Content-Type": "application/json",
  },
};

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...fetchOptions,
    ...options,
    headers: {
      ...fetchOptions.headers,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return d.toLocaleString();
}

function formatShortDate(value) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString();
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusBadge(status) {
  return `<span class="status-badge status-${escapeHtml(status)}">${STATUS_LABELS[status] || status}</span>`;
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
    <div class="stat-card"><strong>${bookings.length}</strong><span>Total bookings</span></div>
    <div class="stat-card"><strong>${pending}</strong><span>Pending</span></div>
    <div class="stat-card"><strong>${confirmed}</strong><span>Confirmed</span></div>
    <div class="stat-card"><strong>${unread}</strong><span>Unread messages</span></div>
  `;
}

function renderBookings(rows) {
  if (rows.length === 0) {
    bookingsBody.innerHTML = `<tr><td colspan="9" class="empty">No bookings match your filters.</td></tr>`;
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

  if (rows.length === 0) {
    availabilitySlots.innerHTML = `<p class="empty slot-empty">No times set for this date yet. Add clinic hours or individual times above.</p>`;
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
        meta = "Patients can book this time online";
      }

      const actions = slot.is_booked
        ? `<span class="slot-meta">${escapeHtml(meta)}</span>`
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
  if (!availabilityDate) {
    return;
  }

  availabilityError.textContent = "";

  const result = await apiFetch(
    `/api/admin/availability?date=${encodeURIComponent(availabilityDate.value)}`
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
}

function showDashboard(username) {
  if (adminUserEl && username) {
    adminUserEl.textContent = username;
  }
  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
}

function showLogin() {
  dashboard.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  closeBookingModal();
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
      body: JSON.stringify({ date: availabilityDate.value }),
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
  if (event.key === "Escape" && !bookingModal.classList.contains("hidden")) {
    closeBookingModal();
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
