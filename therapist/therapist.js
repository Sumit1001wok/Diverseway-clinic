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
const attendanceTodayStatus = document.getElementById("attendance-today-status");
const attendanceCheckInBtn = document.getElementById("attendance-check-in");
const attendanceCheckOutBtn = document.getElementById("attendance-check-out");
const attendanceError = document.getElementById("attendance-error");
const attendanceBody = document.getElementById("attendance-body");
const assessmentsListView = document.getElementById("assessments-list-view");
const assessmentsFormView = document.getElementById("assessments-form-view");
const assessmentsBody = document.getElementById("assessments-body");
const newAssessmentBtn = document.getElementById("new-assessment-btn");
const assessmentFormTitle = document.getElementById("assessment-form-title");
const assessmentFormCancelBtn = document.getElementById("assessment-form-cancel");
const assessmentForm = document.getElementById("assessment-form");
const assessmentFormFields = document.getElementById("assessment-form-fields");
const assessmentFormError = document.getElementById("assessment-form-error");

// STATUS_LABELS, escapeHtml, formatDate, statusBadge, and apiFetch come from
// ../js/dashboard-utils.js, loaded before this file.

let allBookings = [];
let allAttendance = [];
let allAssessments = [];
let editingAssessmentId = null;

function formatTimeOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function todayIsoDate() {
  // Matches the server's Nepal-local "today" closely enough for choosing which
  // row of allAttendance is "today's" row for button state — the server is
  // still the source of truth for what date a check-in/out actually lands on.
  return new Date().toISOString().slice(0, 10);
}

function renderAttendance() {
  const today = todayIsoDate();
  const todayRow = allAttendance.find((row) => row.date === today);

  if (!todayRow) {
    attendanceTodayStatus.textContent = "You haven't checked in today.";
    attendanceCheckInBtn.classList.remove("hidden");
    attendanceCheckOutBtn.classList.add("hidden");
  } else if (todayRow.check_in_time && !todayRow.check_out_time) {
    attendanceTodayStatus.textContent = `Checked in today at ${formatTimeOnly(todayRow.check_in_time)}.`;
    attendanceCheckInBtn.classList.add("hidden");
    attendanceCheckOutBtn.classList.remove("hidden");
  } else if (todayRow.check_in_time && todayRow.check_out_time) {
    attendanceTodayStatus.textContent = `Checked in at ${formatTimeOnly(todayRow.check_in_time)} · checked out at ${formatTimeOnly(todayRow.check_out_time)}.`;
    attendanceCheckInBtn.classList.add("hidden");
    attendanceCheckOutBtn.classList.add("hidden");
  }

  if (!allAttendance.length) {
    attendanceBody.innerHTML = '<tr><td colspan="3" class="empty">No attendance recorded yet.</td></tr>';
    return;
  }

  attendanceBody.innerHTML = allAttendance
    .map(
      (row) => `
    <tr>
      <td>${escapeHtml(row.date)}</td>
      <td>${row.check_in_time ? escapeHtml(formatTimeOnly(row.check_in_time)) : "—"}</td>
      <td>${row.check_out_time ? escapeHtml(formatTimeOnly(row.check_out_time)) : "—"}</td>
    </tr>`
    )
    .join("");
}

async function loadAttendance() {
  const res = await apiFetch("/api/therapist/attendance");
  allAttendance = res.data;
  renderAttendance();
}

attendanceCheckInBtn.addEventListener("click", async () => {
  attendanceError.textContent = "";
  attendanceCheckInBtn.disabled = true;
  try {
    await apiFetch("/api/therapist/attendance/check-in", { method: "POST" });
    await loadAttendance();
  } catch (err) {
    attendanceError.textContent = err.message || "Could not check in.";
  } finally {
    attendanceCheckInBtn.disabled = false;
  }
});

attendanceCheckOutBtn.addEventListener("click", async () => {
  attendanceError.textContent = "";
  attendanceCheckOutBtn.disabled = true;
  try {
    await apiFetch("/api/therapist/attendance/check-out", { method: "POST" });
    await loadAttendance();
  } catch (err) {
    attendanceError.textContent = err.message || "Could not check out.";
  } finally {
    attendanceCheckOutBtn.disabled = false;
  }
});

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

// ASSESSMENT_SECTIONS comes from ../js/assessment-data.js, loaded before this
// file — the single source of truth for both this form and the print view,
// so field ids double as the JSON keys the server stores/returns.
function renderAssessmentFormFields(values) {
  const sections = window.ASSESSMENT_SECTIONS || [];
  assessmentFormFields.innerHTML = sections
    .map((section) => {
      const heading = section.title ? `<h3 class="assessment-section-title">${escapeHtml(section.title)}</h3>` : "";
      const fieldsHtml = section.fields
        .map((f) => {
          const value = values[f.id] || "";
          const labelHtml = f.hideLabel ? "" : `<span>${escapeHtml(f.label)}${f.required ? " *" : ""}</span>`;
          const fieldClass = f.type === "textarea" ? "field field-full" : "field";
          let inputHtml;
          if (f.type === "textarea") {
            const placeholder = f.hideLabel ? escapeHtml(f.label) : "";
            inputHtml = `<textarea id="af-${f.id}" name="${f.id}" rows="3" placeholder="${placeholder}">${escapeHtml(value)}</textarea>`;
          } else if (f.type === "date") {
            inputHtml = `<input id="af-${f.id}" name="${f.id}" type="date" value="${escapeHtml(value)}">`;
          } else {
            inputHtml = `<input id="af-${f.id}" name="${f.id}" type="text" value="${escapeHtml(value)}"${f.required ? " required" : ""}>`;
          }
          return `<label class="${fieldClass}">${labelHtml}${inputHtml}</label>`;
        })
        .join("");
      return `${heading}<div class="form-grid field-grid assessment-section-grid">${fieldsHtml}</div>`;
    })
    .join("");
}

function collectAssessmentFormValues() {
  const values = {};
  (window.ASSESSMENT_SECTIONS || []).forEach((section) => {
    section.fields.forEach((f) => {
      const el = document.getElementById(`af-${f.id}`);
      if (el) {
        values[f.id] = el.value.trim();
      }
    });
  });
  return values;
}

function showAssessmentForm(assessment) {
  editingAssessmentId = assessment ? assessment.id : null;
  assessmentFormTitle.textContent = assessment ? `Edit assessment — ${assessment.client_name}` : "New assessment";
  assessmentFormError.textContent = "";
  renderAssessmentFormFields(assessment || {});
  assessmentsListView.classList.add("hidden");
  assessmentsFormView.classList.remove("hidden");
}

function showAssessmentList() {
  assessmentsFormView.classList.add("hidden");
  assessmentsListView.classList.remove("hidden");
}

function renderAssessmentsList() {
  if (!allAssessments.length) {
    assessmentsBody.innerHTML = '<tr><td colspan="4" class="empty">No assessments yet.</td></tr>';
    return;
  }

  assessmentsBody.innerHTML = allAssessments
    .map(
      (a) => `
    <tr>
      <td>${escapeHtml(a.client_name)}</td>
      <td>${escapeHtml(a.assessment_date || "—")}</td>
      <td>${formatDate(a.updated_at || a.created_at)}</td>
      <td class="therapist-row-actions">
        <button type="button" class="btn-outline btn-sm" data-edit-assessment="${a.id}">Edit</button>
        <button type="button" class="btn-outline btn-sm" data-print-assessment="${a.id}">Print</button>
        <button type="button" class="btn-danger btn-sm" data-delete-assessment="${a.id}">Delete</button>
      </td>
    </tr>`
    )
    .join("");

  document.querySelectorAll("[data-edit-assessment]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const a = allAssessments.find((x) => x.id === Number(btn.dataset.editAssessment));
      if (a) {
        showAssessmentForm(a);
      }
    });
  });

  document.querySelectorAll("[data-print-assessment]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.open(`assessment-print.html?id=${btn.dataset.printAssessment}&role=therapist`, "_blank");
    });
  });

  document.querySelectorAll("[data-delete-assessment]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!window.confirm("Delete this assessment? This cannot be undone.")) {
        return;
      }
      try {
        await apiFetch(`/api/therapist/assessments/${btn.dataset.deleteAssessment}`, { method: "DELETE" });
        await loadAssessments();
      } catch (err) {
        window.alert(err.message || "Could not delete assessment.");
      }
    });
  });
}

async function loadAssessments() {
  const res = await apiFetch("/api/therapist/assessments");
  allAssessments = res.data;
  renderAssessmentsList();
}

newAssessmentBtn?.addEventListener("click", () => showAssessmentForm(null));
assessmentFormCancelBtn?.addEventListener("click", showAssessmentList);

assessmentForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  assessmentFormError.textContent = "";

  const values = collectAssessmentFormValues();
  if (!values.client_name) {
    assessmentFormError.textContent = "Client name is required.";
    return;
  }

  try {
    if (editingAssessmentId) {
      await apiFetch(`/api/therapist/assessments/${editingAssessmentId}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
    } else {
      await apiFetch("/api/therapist/assessments", { method: "POST", body: JSON.stringify(values) });
    }
    await loadAssessments();
    showAssessmentList();
  } catch (err) {
    assessmentFormError.textContent = err.message || "Could not save assessment.";
  }
});

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

    await Promise.all([loadBookings(), loadAttendance(), loadAssessments()]);
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
      await Promise.all([loadBookings(), loadAttendance(), loadAssessments()]);
      showDashboard(session.user);
      return;
    }
  } catch {
    // Not signed in.
  }

  showLogin();
}

bootstrap();
