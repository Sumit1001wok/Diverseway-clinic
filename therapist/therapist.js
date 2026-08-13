"use strict";

const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const emailInput = document.getElementById("therapist-email-input");
const passwordInput = document.getElementById("therapist-password-input");
const therapistUserEl = document.getElementById("therapist-user");
const therapistServiceLabelEl = document.getElementById("therapist-service-label");
const logoutBtn = document.getElementById("logout-btn");
const bookingsBody = document.getElementById("bookings-body");
const refreshBookingsBtn = document.getElementById("refresh-bookings");

// STATUS_LABELS, escapeHtml, formatDate, statusBadge, and apiFetch come from
// ../js/dashboard-utils.js, loaded before this file.

let allBookings = [];

function showDashboard(user) {
  if (therapistUserEl && user) {
    therapistUserEl.textContent = user.name;
  }
  if (therapistServiceLabelEl && user) {
    therapistServiceLabelEl.textContent = user.service;
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
}

function renderBookings() {
  if (!allBookings.length) {
    bookingsBody.innerHTML = '<tr><td colspan="7" class="empty">No bookings yet.</td></tr>';
    return;
  }

  bookingsBody.innerHTML = allBookings
    .map((row) => {
      const canAct = row.status === "pending" || row.status === "confirmed";
      const actions = canAct
        ? `
          <button type="button" class="btn-outline btn-sm" data-mark="completed" data-id="${row.id}">Mark completed</button>
          <button type="button" class="btn-outline btn-sm" data-mark="no_show" data-id="${row.id}">No-show</button>`
        : "";

      return `
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
      <td>${escapeHtml(
        [formatShortDate(row.confirmed_date || row.preferred_date), row.confirmed_time || row.preferred_time]
          .filter(Boolean)
          .join(" ") || "—"
      )}</td>
      <td>${statusBadge(row.status)}</td>
      <td class="therapist-row-actions">${actions}</td>
    </tr>`;
    })
    .join("");

  document.querySelectorAll("[data-mark]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.id);
      const status = btn.dataset.mark;
      btn.disabled = true;
      try {
        await apiFetch(`/api/therapist/bookings/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        await loadBookings();
      } catch (err) {
        window.alert(err.message || "Could not update booking.");
        btn.disabled = false;
      }
    });
  });
}

function formatShortDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function loadBookings() {
  const res = await apiFetch("/api/therapist/bookings");
  allBookings = res.data;
  renderBookings();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

  try {
    const result = await apiFetch("/api/therapist/login", {
      method: "POST",
      body: JSON.stringify({
        email: emailInput.value.trim(),
        password: passwordInput.value,
      }),
    });

    await loadBookings();
    showDashboard(result.user);
  } catch (err) {
    loginError.textContent = err.message || "Invalid email or password.";
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await apiFetch("/api/therapist/logout", { method: "POST" });
  } catch {
    // Still show login screen locally if logout request fails.
  }

  passwordInput.value = "";
  showLogin();
});

refreshBookingsBtn?.addEventListener("click", loadBookings);

async function bootstrap() {
  try {
    const session = await apiFetch("/api/therapist/session");
    if (session.authenticated) {
      await loadBookings();
      showDashboard(session.user);
      return;
    }
  } catch {
    // Not signed in.
  }

  showLogin();
}

bootstrap();
