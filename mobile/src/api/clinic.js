import { apiFetch } from "./client";

export function getServices() {
  return apiFetch("/api/services");
}

export function getAvailability(date, service) {
  const params = new URLSearchParams({ date, service });
  return apiFetch(`/api/availability?${params.toString()}`);
}

export function createBooking(payload) {
  return apiFetch("/api/booking", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitScreening(payload) {
  return apiFetch("/api/screening", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitScreeningContact(id, payload) {
  return apiFetch(`/api/screening/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
