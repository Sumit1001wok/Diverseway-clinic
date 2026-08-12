"use strict";

// WhatsApp direct messages: +977 9845366417 → use "9779845366417" in wa.me (no +). Same in all HTML wa.me links.
const WHATSAPP_PHONE = "9779845366417";

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  return data;
}

function attachLiveValidation(input, isValid) {
  if (!input) {
    return;
  }

  const field = input.closest(".field");
  if (!field) {
    return;
  }

  let touched = false;

  function update() {
    const value = input.value.trim();
    if (!touched && !value) {
      field.classList.remove("is-valid", "is-invalid");
      return;
    }
    const valid = isValid(value);
    field.classList.toggle("is-valid", valid);
    field.classList.toggle("is-invalid", !valid);
  }

  input.addEventListener("blur", () => {
    touched = true;
    update();
  });
  input.addEventListener("input", () => {
    if (touched) {
      update();
    }
  });
}

const VALIDATORS = {
  nonEmpty: (v) => v.length > 0,
  email: (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  emailRequired: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v) => v.length >= 7 && v.length <= 20,
};
window.VALIDATORS = VALIDATORS;
window.attachLiveValidation = attachLiveValidation;

function setFormFeedback(errorEl, successEl, { error = "", success = "" } = {}) {
  if (errorEl) {
    errorEl.textContent = error;
    errorEl.classList.remove("is-shown");
    if (error) {
      void errorEl.offsetWidth;
      errorEl.classList.add("is-shown");
    }
  }
  if (successEl) {
    successEl.textContent = success;
    successEl.hidden = !success;
    successEl.classList.remove("is-shown");
    if (success) {
      void successEl.offsetWidth;
      successEl.classList.add("is-shown");
    }
  }
}

const siteHeader = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");

function updateHeaderScrollState() {
  if (!siteHeader) {
    return;
  }

  siteHeader.classList.toggle("is-scrolled", window.scrollY > 60);
}

function closeMenuOnDesktop() {
  if (!siteHeader || !menuToggle || window.innerWidth > 760) {
    return;
  }

  siteHeader.classList.remove("nav-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

if (menuToggle && siteHeader) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteHeader.classList.toggle("nav-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.querySelectorAll(".nav-menu a").forEach((link) => {
    link.addEventListener("click", closeMenuOnDesktop);
  });
}

window.addEventListener("scroll", updateHeaderScrollState, { passive: true });
window.addEventListener("resize", () => {
  if (!siteHeader || !menuToggle) {
    return;
  }

  if (window.innerWidth > 760) {
    siteHeader.classList.remove("nav-open");
    menuToggle.setAttribute("aria-expanded", "false");
  }
});

updateHeaderScrollState();

/* Page load fade-in */
function initPageFade() {
  document.body.classList.add("page-ready");
}

/* Lazy image fade-in (works for images injected later by content.js) */
document.documentElement.classList.add("img-fade-ready");

document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
  if (img.complete && img.naturalWidth > 0) {
    img.classList.add("is-loaded");
  }
});

document.addEventListener(
  "load",
  (event) => {
    const target = event.target;
    if (target instanceof HTMLImageElement && target.loading === "lazy") {
      target.classList.add("is-loaded");
    }
  },
  true
);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPageFade);
} else {
  initPageFade();
}

const revealElements = document.querySelectorAll(".reveal");
const counters = document.querySelectorAll(".counter");

function animateCounter(counter) {
  if (counter.dataset.animated === "true") {
    return;
  }

  const target = Number(counter.dataset.target || 0);
  const suffix = counter.dataset.suffix || "";
  const durationMs = 1500;
  const start = performance.now();

  counter.dataset.animated = "true";

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / durationMs, 1);
    const eased = 1 - (1 - progress) * (1 - progress);
    const value = Math.floor(target * eased);
    counter.textContent = `${value}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      counter.textContent = `${target}${suffix}`;
    }
  }

  requestAnimationFrame(step);
}

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("visible");

      entry.target.querySelectorAll(".counter").forEach((counter) => {
        animateCounter(counter);
      });

      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.15 }
);

revealElements.forEach((element) => {
  revealObserver.observe(element);
});

if (counters.length > 0 && revealElements.length === 0) {
  counters.forEach((counter) => animateCounter(counter));
}

function initTestimonialCarousel() {
  const track = document.getElementById("testimonial-track");
  const wrapper = document.getElementById("testimonial-track-wrapper");
  const dotsEl = document.getElementById("testimonial-dots");
  const prevBtn = document.getElementById("testimonial-prev");
  const nextBtn = document.getElementById("testimonial-next");
  if (!track || !wrapper) {
    return;
  }

  const cards = Array.from(track.querySelectorAll(".testimonial-card"));
  if (cards.length === 0) {
    return;
  }

  if (cards.length === 1) {
    wrapper.classList.add("is-single");
    prevBtn?.classList.add("hidden");
    nextBtn?.classList.add("hidden");
    return;
  }

  let activeIndex = 0;
  let timer = null;
  const AUTO_MS = 5000;

  if (dotsEl) {
    dotsEl.innerHTML = cards
      .map((_, i) => `<button type="button" class="testimonial-dot${i === 0 ? " is-active" : ""}" data-index="${i}" aria-label="Show testimonial ${i + 1}"></button>`)
      .join("");
  }
  const dots = dotsEl ? Array.from(dotsEl.querySelectorAll(".testimonial-dot")) : [];

  function goTo(index) {
    activeIndex = (index + cards.length) % cards.length;
    track.style.transform = `translateX(-${activeIndex * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === activeIndex));
  }

  function startAuto() {
    stopAuto();
    timer = setInterval(() => goTo(activeIndex + 1), AUTO_MS);
  }

  function stopAuto() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  prevBtn?.addEventListener("click", () => {
    goTo(activeIndex - 1);
    startAuto();
  });
  nextBtn?.addEventListener("click", () => {
    goTo(activeIndex + 1);
    startAuto();
  });
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      goTo(Number(dot.dataset.index));
      startAuto();
    });
  });

  wrapper.addEventListener("mouseenter", stopAuto);
  wrapper.addEventListener("mouseleave", startAuto);
  wrapper.addEventListener("focusin", stopAuto);
  wrapper.addEventListener("focusout", startAuto);

  goTo(0);
  startAuto();
}

window.initTestimonialCarousel = initTestimonialCarousel;

const staticTestimonialTrack = document.querySelector(".testimonial-track");
if (staticTestimonialTrack && staticTestimonialTrack.querySelector(".testimonial-card")) {
  initTestimonialCarousel();
}

// Gallery: filter + lightbox
const filterButtons = document.querySelectorAll(".filter-btn");
const galleryItems = Array.from(document.querySelectorAll(".gallery-item"));
const masonry = document.querySelector(".masonry");

function buildLightbox() {
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = `
    <div class="lightbox-backdrop" data-action="close"></div>
    <div class="lightbox-panel" role="dialog" aria-modal="true" aria-label="Image preview">
      <button class="lightbox-btn lightbox-close" type="button" aria-label="Close" data-action="close">
        <svg class="lightbox-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3 1.42 1.42Z"/></svg>
      </button>
      <button class="lightbox-btn lightbox-prev" type="button" aria-label="Previous image" data-action="prev">
        <svg class="lightbox-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12l4.6-4.6Z"/></svg>
      </button>
      <button class="lightbox-btn lightbox-next" type="button" aria-label="Next image" data-action="next">
        <svg class="lightbox-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.6 16.6 10 18l6-6-6-6-1.4 1.4L13.2 12 8.6 16.6Z"/></svg>
      </button>
      <div class="lightbox-media"><img alt="" loading="lazy"></div>
      <div class="lightbox-caption"></div>
    </div>
  `;
  document.body.appendChild(lightbox);
  return lightbox;
}

function getVisibleItems() {
  return galleryItems.filter((item) => !item.classList.contains("is-hidden"));
}

if (masonry && galleryItems.length > 0) {
  const lightbox = buildLightbox();
  const lightboxImg = lightbox.querySelector(".lightbox-media img");
  const lightboxCaption = lightbox.querySelector(".lightbox-caption");
  let activeIndex = 0;

  function openLightboxByVisibleIndex(index) {
    const visible = getVisibleItems();
    if (visible.length === 0) {
      return;
    }

    activeIndex = (index + visible.length) % visible.length;
    const item = visible[activeIndex];
    const img = item.querySelector("img");
    const caption = item.dataset.caption || item.querySelector(".gallery-caption")?.textContent || "";

    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt || caption;
    lightboxCaption.textContent = caption;

    lightbox.classList.add("is-open");
    document.body.classList.add("no-scroll");
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }

  function goNext(delta) {
    openLightboxByVisibleIndex(activeIndex + delta);
  }

  galleryItems.forEach((item) => {
    item.addEventListener("click", () => {
      const visible = getVisibleItems();
      const idx = visible.indexOf(item);
      openLightboxByVisibleIndex(Math.max(0, idx));
    });
  });

  lightbox.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) {
      return;
    }
    const action = target.dataset.action;
    if (action === "close") {
      closeLightbox();
    } else if (action === "prev") {
      goNext(-1);
    } else if (action === "next") {
      goNext(1);
    }
  });

  window.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) {
      return;
    }

    if (e.key === "Escape") {
      closeLightbox();
    } else if (e.key === "ArrowLeft") {
      goNext(-1);
    } else if (e.key === "ArrowRight") {
      goNext(1);
    }
  });

  function applyFilter(filter) {
    galleryItems.forEach((item) => {
      const category = item.dataset.category;
      const show = filter === "all" || category === filter;
      item.classList.toggle("is-hidden", !show);
    });
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      btn.setAttribute("aria-selected", "true");
      applyFilter(btn.dataset.filter || "all");
    });
  });

  const defaultFilter = document.querySelector(".filter-btn.is-active");
  if (defaultFilter) {
    defaultFilter.setAttribute("aria-pressed", "true");
    defaultFilter.setAttribute("aria-selected", "true");
  }
}

// Floating WhatsApp button on all pages
if (!document.querySelector(".wa-float")) {
  const waFloat = document.createElement("a");
  waFloat.className = "wa-float";
  waFloat.href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent("Hello Diverse Way Clinic!")}`;
  waFloat.target = "_blank";
  waFloat.rel = "noopener noreferrer";
  waFloat.setAttribute("aria-label", "Chat with us on WhatsApp");
  waFloat.innerHTML = `<svg class="wa-float-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.78 14.78L2 22l5.36-1.2A10 10 0 1 0 12 2Zm0 18.5a8.48 8.48 0 0 1-4.33-1.18l-.3-.18l-3.18.7l.7-3.1l-.2-.32A8.5 8.5 0 1 1 12 20.5Zm4.83-6.34c-.26-.13-1.55-.76-1.8-.84c-.24-.09-.42-.13-.6.13c-.18.26-.68.84-.84 1.02c-.15.18-.3.2-.56.07c-.26-.13-1.1-.4-2.1-1.28c-.78-.7-1.3-1.55-1.45-1.8c-.15-.25-.02-.38.11-.5c.12-.12.26-.3.39-.45c.13-.15.18-.25.27-.42c.09-.18.04-.33-.02-.46c-.07-.13-.6-1.44-.82-1.97c-.22-.53-.45-.46-.6-.47h-.52c-.17 0-.46.06-.7.33c-.24.26-.92.9-.92 2.2c0 1.3.94 2.55 1.07 2.73c.13.18 1.84 2.8 4.45 3.93c.62.27 1.1.43 1.48.55c.62.2 1.18.17 1.62.1c.5-.08 1.55-.64 1.77-1.25c.22-.62.22-1.14.15-1.26c-.06-.12-.24-.2-.5-.33Z"/></svg><span class="wa-float-tooltip">Chat with us</span>`;
  document.body.appendChild(waFloat);
}

// Shared, page-wide patient session check — fetched once and reused by every
// consumer below (nav link label, booking-form prefill) instead of each
// issuing its own /api/auth/session request.
let patientSessionPromise = null;
function getPatientSession() {
  if (!patientSessionPromise) {
    patientSessionPromise = fetch("/api/auth/session", { credentials: "same-origin" })
      .then((res) => res.json())
      .catch(() => ({ authenticated: false }));
  }
  return patientSessionPromise;
}

// Patient account nav link: swap "Login" for the patient's first name when signed in.
// (account.html handles its own nav link via js/account.js; this covers every other page.)
const navAccountLink = document.getElementById("nav-account-link");
if (navAccountLink && !document.getElementById("account-login-screen")) {
  getPatientSession().then((data) => {
    if (data.authenticated && data.user) {
      navAccountLink.textContent = data.user.name ? data.user.name.split(" ")[0] : "My Account";
    }
  });
}

// Back-to-top button on all pages
if (!document.querySelector(".back-to-top")) {
  const backToTop = document.createElement("button");
  backToTop.type = "button";
  backToTop.className = "back-to-top";
  backToTop.setAttribute("aria-label", "Back to top");
  backToTop.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5.83 6.41 11.4 5 10l7-7 7 7-1.41 1.41L12 5.83Zm0 6.34L6.41 17.7 5 16.3l7-7 7 7-1.41 1.4L12 12.17Z"/></svg>`;
  document.body.appendChild(backToTop);

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) {
        return;
      }
      ticking = true;
      requestAnimationFrame(() => {
        backToTop.classList.toggle("is-visible", window.scrollY > 640);
        ticking = false;
      });
    },
    { passive: true }
  );
}

// Booking page: submit to API + optional WhatsApp
const bookingButton = document.getElementById("bk-submit");
const bookingWhatsAppButton = document.getElementById("bk-whatsapp");
if (bookingButton || bookingWhatsAppButton) {
  const nameInput = document.getElementById("bk-name");
  const phoneInput = document.getElementById("bk-phone");
  const emailInput = document.getElementById("bk-email");
  const visitTypeInput = document.getElementById("bk-visit-type");
  const patientNameInput = document.getElementById("bk-patient-name");
  const patientAgeInput = document.getElementById("bk-patient-age");
  const serviceInput = document.getElementById("bk-service");
  const serviceHelp = document.getElementById("bk-service-help");
  const dateInput = document.getElementById("bk-date");
  const timeInput = document.getElementById("bk-time");
  const timeHelp = document.getElementById("bk-time-help");
  const messageInput = document.getElementById("bk-message");
  const errorEl = document.getElementById("bk-error");
  const successEl = document.getElementById("bk-success");

  function redirectToEsewa(payment) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = payment.formUrl;
    Object.entries(payment.fields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  // After returning from eSewa, the URL carries ?payment=success|failed&ref=...
  (function handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) {
      return;
    }

    const ref = params.get("ref");
    if (payment === "success") {
      setFormFeedback(errorEl, successEl, {
        success: ref
          ? `Payment received — your appointment request is confirmed! Reference: ${ref}. We will contact you shortly.`
          : "Payment received — your appointment request is confirmed! We will contact you shortly.",
      });
    } else {
      setFormFeedback(errorEl, successEl, {
        error: "Payment was not completed, so the booking wasn't confirmed. Please try again.",
      });
    }

    // Drop the query params so refreshing the page doesn't re-show this message.
    window.history.replaceState({}, "", window.location.pathname);
  })();

  attachLiveValidation(nameInput, VALIDATORS.nonEmpty);
  attachLiveValidation(phoneInput, VALIDATORS.phone);
  attachLiveValidation(emailInput, VALIDATORS.email);

  if (dateInput) {
    dateInput.min = new Date().toISOString().slice(0, 10);
  }

  const BOOKING_DURATIONS = {
    Consultation: 15,
    "Speech Therapy": 30,
    "Occupational Therapy": 45,
    "Behaviour Therapy": 45,
    "Psychological Counselling": 45,
    "Voice Therapy": 30,
    "Special Education Support": 45,
    Other: 45,
  };

  function updateServiceHelp() {
    if (!serviceHelp) {
      return;
    }

    const service = (serviceInput?.value || "").trim();
    const duration = BOOKING_DURATIONS[service];

    if (!service) {
      serviceHelp.textContent = "Select a service first — available times depend on session length.";
      return;
    }

    serviceHelp.textContent = `${service} sessions are ${duration} minutes. Pick a date to load open times.`;
  }

  function applyServiceFromUrl() {
    const service = new URLSearchParams(window.location.search).get("service");
    if (!serviceInput || !service) {
      return;
    }

    const options = Array.from(serviceInput.options);
    const match = options.find((option) => option.value === service || option.text.startsWith(service));

    if (match) {
      serviceInput.value = match.value;
      updateServiceHelp();
      loadAvailableTimes();
    }
  }

  async function loadAvailableTimes() {
    if (!timeInput) {
      return;
    }

    const date = (dateInput?.value || "").trim();
    const service = (serviceInput?.value || "").trim();

    if (!date) {
      timeInput.innerHTML = `<option value="">Select a date first</option>`;
      timeInput.disabled = true;
      if (timeHelp) {
        timeHelp.textContent = "Choose a date to see available appointment times.";
      }
      return;
    }

    if (!service) {
      timeInput.innerHTML = `<option value="">Select a service first</option>`;
      timeInput.disabled = true;
      if (timeHelp) {
        timeHelp.textContent = "Select a service to see session length and available times.";
      }
      return;
    }

    timeInput.disabled = true;
    timeInput.innerHTML = `<option value="">Loading times…</option>`;

    try {
      const params = new URLSearchParams({ date, service });
      const res = await fetch(`/api/availability?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not load available times.");
      }

      if (!data.data.length) {
        timeInput.innerHTML = `<option value="">No posted times for this date</option>`;
        timeInput.disabled = false;
        if (timeHelp) {
          timeHelp.textContent = `No ${data.duration_minutes}-minute slots available for this date yet. You can still submit your request and we'll contact you to schedule.`;
        }
        return;
      }

      timeInput.innerHTML =
        `<option value="">Select an available time</option>` +
        data.data
          .map((slot) => `<option value="${slot.time}">${slot.label}</option>`)
          .join("");
      timeInput.disabled = false;
      if (timeHelp) {
        timeHelp.textContent = `${data.data.length} available ${data.duration_minutes}-minute session(s) for ${service}.`;
      }
    } catch (err) {
      timeInput.innerHTML = `<option value="">Could not load times</option>`;
      timeInput.disabled = false;
      if (timeHelp) {
        timeHelp.textContent = err.message;
      }
    }
  }

  dateInput?.addEventListener("change", () => {
    loadAvailableTimes();
  });

  serviceInput?.addEventListener("change", () => {
    updateServiceHelp();
    loadAvailableTimes();
  });

  updateServiceHelp();
  applyServiceFromUrl();

  function escapeHtml(text) {
    return String(text ?? "").replace(/[&<>"']/g, (char) => {
      switch (char) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        default: return "&#39;";
      }
    });
  }

  function quickSlotDateLabel(dateStr) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    if (dateStr === todayStr) return "Today";
    if (dateStr === tomorrowStr) return "Tomorrow";

    const parsed = new Date(`${dateStr}T00:00:00`);
    return parsed.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  async function selectQuickSlot(service, date, time) {
    if (!serviceInput || !dateInput || !timeInput) {
      return;
    }

    serviceInput.value = service;
    updateServiceHelp();
    dateInput.value = date;
    await loadAvailableTimes();
    timeInput.value = time;

    document.getElementById("bk-name")?.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("bk-name")?.focus();
  }

  async function loadQuickSlots() {
    const container = document.getElementById("quick-slots-list");
    if (!container) {
      return;
    }

    try {
      const res = await fetch("/api/availability/upcoming");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not load available times.");
      }

      const groups = Object.entries(data.data).filter(([, slots]) => slots.length > 0);

      if (!groups.length) {
        container.innerHTML = `<p class="empty quick-slots-empty">No open times posted yet — submit the form below and we'll contact you to schedule, or message us on WhatsApp.</p>`;
        return;
      }

      container.innerHTML = groups
        .map(([service, slots]) => {
          const chips = slots
            .map(
              (slot) => `
              <button type="button" class="quick-slot-chip" data-service="${escapeHtml(service)}" data-date="${slot.date}" data-time="${slot.time}">
                ${escapeHtml(quickSlotDateLabel(slot.date))} · ${escapeHtml(slot.label.split(" – ")[0])}
              </button>`
            )
            .join("");
          return `
            <div class="quick-slots-group">
              <h3 class="quick-slots-service">${escapeHtml(service)} <span class="muted">(${slots[0].duration_minutes} min)</span></h3>
              <div class="quick-slots-chips">${chips}</div>
            </div>`;
        })
        .join("");

      container.querySelectorAll("[data-service]").forEach((chip) => {
        chip.addEventListener("click", () => {
          selectQuickSlot(chip.dataset.service, chip.dataset.date, chip.dataset.time);
        });
      });
    } catch (err) {
      container.innerHTML = `<p class="empty quick-slots-empty">Could not load available times right now.</p>`;
    }
  }

  loadQuickSlots();

  getPatientSession()
    .then((data) => {
      if (!data.authenticated || !data.user) {
        return;
      }
      if (nameInput && !nameInput.value) nameInput.value = data.user.name || "";
      if (emailInput && !emailInput.value) emailInput.value = data.user.email || "";
      if (phoneInput && !phoneInput.value) phoneInput.value = data.user.phone || "";
    })
    .catch(() => {
      // Not signed in / request failed — leave the booking form as-is.
    });

  function getBookingFields() {
    return {
      name: (nameInput?.value || "").trim(),
      phone: (phoneInput?.value || "").trim(),
      email: (emailInput?.value || "").trim(),
      visit_type: (visitTypeInput?.value || "new").trim(),
      patient_name: (patientNameInput?.value || "").trim(),
      patient_age: (patientAgeInput?.value || "").trim(),
      service: (serviceInput?.value || "").trim(),
      preferred_date: (dateInput?.value || "").trim(),
      preferred_time: (timeInput?.value || "").trim(),
      message: (messageInput?.value || "").trim(),
    };
  }

  function validateBooking(fields) {
    if (!fields.name || !fields.phone || !fields.service) {
      setFormFeedback(errorEl, successEl, {
        error: "Please fill in your name, phone number, and service before booking.",
      });
      return false;
    }

    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      setFormFeedback(errorEl, successEl, {
        error: "Please enter a valid email address.",
      });
      return false;
    }

    setFormFeedback(errorEl, successEl);
    return true;
  }

  function openBookingWhatsApp(fields) {
    const visitLabel = fields.visit_type === "follow_up" ? "Follow-up visit" : "First visit";
    const lines = [
      "Hello Diverse Way Clinic! I'd like to book an appointment.",
      `Name: ${fields.name}`,
      `Phone: ${fields.phone}`,
      fields.email ? `Email: ${fields.email}` : null,
      `Visit type: ${visitLabel}`,
      fields.patient_name ? `Patient: ${fields.patient_name}` : null,
      fields.patient_age ? `Age: ${fields.patient_age}` : null,
      `Service: ${fields.service}`,
      `Preferred date: ${fields.preferred_date || "Not specified"}`,
      `Preferred time: ${fields.preferred_time || "Not specified"}`,
      `Message: ${fields.message || "—"}`,
    ].filter(Boolean);
    const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (bookingButton) {
    bookingButton.addEventListener("click", async () => {
      const fields = getBookingFields();
      if (!validateBooking(fields)) {
        return;
      }

      bookingButton.disabled = true;
      bookingButton.textContent = "Submitting…";

      try {
        const data = await postJson("/api/booking", fields);
        bookingButton.textContent = "Redirecting to payment…";
        setFormFeedback(errorEl, successEl, {
          success: `Reference ${data.reference} — redirecting you to pay the Rs ${data.payment_amount} advance via eSewa…`,
        });
        redirectToEsewa(data.payment);
        return;
      } catch (err) {
        setFormFeedback(errorEl, successEl, { error: err.message });
      } finally {
        bookingButton.disabled = false;
        bookingButton.textContent = "Submit booking request";
      }
    });
  }

  if (bookingWhatsAppButton) {
    bookingWhatsAppButton.addEventListener("click", () => {
      const fields = getBookingFields();
      if (!validateBooking(fields)) {
        return;
      }
      openBookingWhatsApp(fields);
    });
  }
}

// Contact page: submit to API + optional WhatsApp
const contactButton = document.getElementById("ct-submit");
const contactWhatsAppButton = document.getElementById("ct-whatsapp");
if (contactButton || contactWhatsAppButton) {
  const nameInput = document.getElementById("ct-name");
  const emailInput = document.getElementById("ct-email");
  const subjectInput = document.getElementById("ct-subject");
  const messageInput = document.getElementById("ct-message");
  const errorEl = document.getElementById("ct-error");
  const successEl = document.getElementById("ct-success");

  attachLiveValidation(nameInput, VALIDATORS.nonEmpty);
  attachLiveValidation(emailInput, VALIDATORS.email);
  attachLiveValidation(subjectInput, VALIDATORS.nonEmpty);
  attachLiveValidation(messageInput, VALIDATORS.nonEmpty);

  function getContactFields() {
    return {
      name: (nameInput?.value || "").trim(),
      email: (emailInput?.value || "").trim(),
      subject: (subjectInput?.value || "").trim(),
      message: (messageInput?.value || "").trim(),
    };
  }

  function validateContact(fields, requireAll = false) {
    if (requireAll && (!fields.name || !fields.email)) {
      setFormFeedback(errorEl, successEl, {
        error: "Please enter your name and email before sending.",
      });
      return false;
    }

    if (!fields.subject || !fields.message) {
      setFormFeedback(errorEl, successEl, {
        error: "Please enter a subject and message before sending.",
      });
      return false;
    }

    setFormFeedback(errorEl, successEl);
    return true;
  }

  if (contactButton) {
    contactButton.addEventListener("click", async () => {
      const fields = getContactFields();
      if (!validateContact(fields, true)) {
        return;
      }

      contactButton.disabled = true;
      contactButton.textContent = "Sending…";

      try {
        const data = await postJson("/api/contact", fields);
        setFormFeedback(errorEl, successEl, { success: data.message });
        if (nameInput) nameInput.value = "";
        if (emailInput) emailInput.value = "";
        if (subjectInput) subjectInput.value = "";
        if (messageInput) messageInput.value = "";
      } catch (err) {
        setFormFeedback(errorEl, successEl, { error: err.message });
      } finally {
        contactButton.disabled = false;
        contactButton.textContent = "Send message";
      }
    });
  }

  if (contactWhatsAppButton) {
    contactWhatsAppButton.addEventListener("click", () => {
      const fields = getContactFields();
      if (!validateContact(fields)) {
        return;
      }

      const lines = [
        fields.name ? `Name: ${fields.name}` : null,
        fields.email ? `Email: ${fields.email}` : null,
        `Subject: ${fields.subject}`,
        `Message: ${fields.message}`,
      ].filter(Boolean);

      const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(lines.join("\n"))}`;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }
}
