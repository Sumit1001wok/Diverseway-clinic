import { apiFetch } from "./client";

export function register({ name, email, phone, password }) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, phone, password }),
  });
}

export function login({ email, password }) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return apiFetch("/api/auth/logout", { method: "POST" });
}

export function getSession() {
  return apiFetch("/api/auth/session");
}

export function getMyBookings() {
  return apiFetch("/api/auth/account/bookings");
}

export function getMyScreenings() {
  return apiFetch("/api/auth/account/screenings");
}
