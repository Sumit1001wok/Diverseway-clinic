// Points at the live site's API — same backend the website already uses
// (server/routes/api.js, server/routes/auth.js), no separate mobile API.
// Session auth is cookie-based (express-session), so every request goes
// through this one `apiFetch` with credentials: "include" so the session
// cookie set by /api/auth/login is sent back on every later request —
// same mechanism the web app's js/dashboard-utils.js apiFetch relies on.
//
// To point this at a local dev server instead of production while testing:
// set BASE_URL to your machine's LAN IP (not "localhost" — a physical
// device or simulator can't reach your laptop's localhost), e.g.
// "http://192.168.1.23:3000".
export const BASE_URL = "https://www.diversewayclinic.com";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || "Something went wrong. Please try again.");
    error.status = res.status;
    throw error;
  }

  return data;
}
