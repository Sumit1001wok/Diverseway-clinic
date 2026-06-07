"use strict";

const STORAGE_KEY = "dwc_admin_key";

const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const adminKeyInput = document.getElementById("admin-key");
const logoutBtn = document.getElementById("logout-btn");
const bookingsBody = document.getElementById("bookings-body");
const messagesBody = document.getElementById("messages-body");
const statsEl = document.getElementById("admin-stats");

function getKey() {
  return sessionStorage.getItem(STORAGE_KEY) || "";
}

function setKey(key) {
  sessionStorage.setItem(STORAGE_KEY, key);
}

function clearKey() {
  sessionStorage.removeItem(STORAGE_KEY);
}

async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${getKey()}`,
  };

  const res = await fetch(path, { ...options, headers });
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

function renderStats(bookings, messages) {
  const pending = bookings.filter((b) => b.status === "pending").length;
  const unread = messages.filter((m) => !m.is_read).length;

  statsEl.innerHTML = `
    <div class="stat-card"><strong>${bookings.length}</strong><span>Total bookings</span></div>
    <div class="stat-card"><strong>${pending}</strong><span>Pending</span></div>
    <div class="stat-card"><strong>${messages.length}</strong><span>Messages</span></div>
    <div class="stat-card"><strong>${unread}</strong><span>Unread</span></div>
  `;
}

function renderBookings(rows) {
  if (rows.length === 0) {
    bookingsBody.innerHTML = `<tr><td colspan="7" class="empty">No bookings yet.</td></tr>`;
    return;
  }

  bookingsBody.innerHTML = rows
    .map(
      (row) => `
    <tr>
      <td>${formatDate(row.created_at)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.phone)}</td>
      <td>${escapeHtml(row.service)}</td>
      <td>${escapeHtml([row.preferred_date, row.preferred_time].filter(Boolean).join(" ") || "—")}</td>
      <td>
        <select data-booking-id="${row.id}" class="status-select">
          ${["pending", "confirmed", "cancelled", "completed"]
            .map(
              (s) =>
                `<option value="${s}"${row.status === s ? " selected" : ""}>${s}</option>`
            )
            .join("")}
        </select>
      </td>
      <td class="msg-cell">${escapeHtml(row.message || "—")}</td>
    </tr>`
    )
    .join("");

  bookingsBody.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", async () => {
      const id = select.dataset.bookingId;
      try {
        await apiFetch(`/api/admin/bookings/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: select.value }),
        });
      } catch (err) {
        alert(err.message);
        await loadDashboard();
      }
    });
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_read: !isRead }),
        });
        await loadDashboard();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadDashboard() {
  const [bookingsRes, messagesRes] = await Promise.all([
    apiFetch("/api/admin/bookings"),
    apiFetch("/api/admin/messages"),
  ]);

  renderStats(bookingsRes.data, messagesRes.data);
  renderBookings(bookingsRes.data);
  renderMessages(messagesRes.data);
}

function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
}

function showLogin() {
  dashboard.classList.add("hidden");
  loginScreen.classList.remove("hidden");
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  setKey(adminKeyInput.value.trim());

  try {
    await loadDashboard();
    showDashboard();
  } catch {
    clearKey();
    loginError.textContent = "Invalid admin key or server unavailable.";
  }
});

logoutBtn.addEventListener("click", () => {
  clearKey();
  adminKeyInput.value = "";
  showLogin();
});

if (getKey()) {
  loadDashboard()
    .then(showDashboard)
    .catch(() => {
      clearKey();
      showLogin();
    });
}
