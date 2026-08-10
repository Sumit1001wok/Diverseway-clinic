"use strict";

// Shared helpers for the two authenticated dashboards (admin/admin.js and
// js/account.js) — status/tier label maps, HTML escaping, date formatting,
// and a fetch wrapper that throws on non-2xx responses.

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

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (char) => {
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
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

window.STATUS_LABELS = STATUS_LABELS;
window.TIER_LABELS = TIER_LABELS;
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.statusBadge = statusBadge;
window.apiFetch = apiFetch;
