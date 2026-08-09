"use strict";

(function () {
  const loginScreen = document.getElementById("account-login-screen");
  const dashboard = document.getElementById("account-dashboard");
  if (!loginScreen || !dashboard) {
    return;
  }

  const tabs = document.getElementById("account-tabs");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginError = document.getElementById("login-error");
  const registerError = document.getElementById("register-error");
  const accountNameEl = document.getElementById("account-name");
  const logoutBtn = document.getElementById("account-logout");
  const bookingsBody = document.getElementById("account-bookings-body");
  const screeningsBody = document.getElementById("account-screenings-body");
  const navAccountLink = document.getElementById("nav-account-link");

  const STATUS_LABELS = {
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const TIER_LABELS = {
    ontrack: "✅ On Track",
    monitor: "⚠️ Monitor & Rescreen",
    consult: "🟠 Consult SLP",
    refer: "🔴 Refer Immediately",
  };

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => {
      switch (char) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        default:
          return "&#39;";
      }
    });
  }

  function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
    return d.toLocaleString();
  }

  function statusBadge(status) {
    return `<span class="status-badge status-${escapeHtml(status)}">${STATUS_LABELS[status] || status}</span>`;
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  }

  tabs?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-tab]");
    if (!btn) return;

    tabs.querySelectorAll(".account-tab").forEach((el) => {
      el.classList.toggle("is-active", el === btn);
      el.setAttribute("aria-selected", String(el === btn));
    });

    const showRegister = btn.dataset.tab === "register";
    loginForm.classList.toggle("hidden", showRegister);
    registerForm.classList.toggle("hidden", !showRegister);
  });

  function renderBookings(rows) {
    if (!rows.length) {
      bookingsBody.innerHTML = '<tr><td colspan="5" class="empty">No appointment requests yet.</td></tr>';
      return;
    }
    bookingsBody.innerHTML = rows
      .map(
        (b) => `
      <tr>
        <td><code>${escapeHtml(b.reference)}</code></td>
        <td>${formatDate(b.created_at)}</td>
        <td>${escapeHtml(b.service)}</td>
        <td>${escapeHtml([b.preferred_date, b.preferred_time].filter(Boolean).join(" ") || "Not specified")}</td>
        <td>${statusBadge(b.status)}</td>
      </tr>`
      )
      .join("");
  }

  function renderScreenings(rows) {
    if (!rows.length) {
      screeningsBody.innerHTML = '<tr><td colspan="3" class="empty">No screenings completed yet.</td></tr>';
      return;
    }
    screeningsBody.innerHTML = rows
      .map(
        (s) => `
      <tr>
        <td>${formatDate(s.created_at)}</td>
        <td>${escapeHtml(s.category_label || s.category)}</td>
        <td>${TIER_LABELS[s.conclusion] || escapeHtml(s.conclusion)}</td>
      </tr>`
      )
      .join("");
  }

  async function loadDashboardData() {
    const [bookingsRes, screeningsRes] = await Promise.all([
      apiFetch("/api/auth/account/bookings"),
      apiFetch("/api/auth/account/screenings"),
    ]);
    renderBookings(bookingsRes.data);
    renderScreenings(screeningsRes.data);
  }

  function showDashboard(user) {
    loginScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
    if (accountNameEl) {
      accountNameEl.textContent = user.name || "there";
    }
    if (navAccountLink) {
      navAccountLink.textContent = user.name ? user.name.split(" ")[0] : "My Account";
    }
    loadDashboardData().catch((err) => console.error("Failed to load account data", err));
  }

  function showLogin() {
    dashboard.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    if (navAccountLink) {
      navAccountLink.textContent = "Login";
    }
  }

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    try {
      const result = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("login-email").value.trim(),
          password: document.getElementById("login-password").value,
        }),
      });
      showDashboard(result.user);
    } catch (err) {
      loginError.textContent = err.message;
    }
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    registerError.textContent = "";
    try {
      const result = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("register-name").value.trim(),
          email: document.getElementById("register-email").value.trim(),
          phone: document.getElementById("register-phone").value.trim(),
          password: document.getElementById("register-password").value,
        }),
      });
      showDashboard(result.user);
    } catch (err) {
      registerError.textContent = err.message;
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Show login screen locally regardless.
    }
    showLogin();
  });

  if (typeof window.attachLiveValidation === "function" && window.VALIDATORS) {
    attachLiveValidation(document.getElementById("login-email"), VALIDATORS.emailRequired);
    attachLiveValidation(document.getElementById("register-name"), VALIDATORS.nonEmpty);
    attachLiveValidation(document.getElementById("register-email"), VALIDATORS.emailRequired);
    attachLiveValidation(document.getElementById("register-password"), (v) => v.length >= 8);
  }

  async function bootstrap() {
    try {
      const session = await apiFetch("/api/auth/session");
      if (session.authenticated) {
        showDashboard(session.user);
        return;
      }
    } catch {
      // Not signed in.
    }
    showLogin();
  }

  bootstrap();
})();
