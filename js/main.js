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

function setFormFeedback(errorEl, successEl, { error = "", success = "" } = {}) {
  if (errorEl) {
    errorEl.textContent = error;
  }
  if (successEl) {
    successEl.textContent = success;
    successEl.hidden = !success;
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPageFade);
} else {
  initPageFade();
}

const revealElements = document.querySelectorAll(".reveal");
const counters = document.querySelectorAll(".counter");
const testimonialTrack = document.querySelector(".testimonial-track");
const testimonialCards = document.querySelectorAll(".testimonial-card");

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

if (testimonialTrack && testimonialCards.length > 1) {
  let activeIndex = 0;

  setInterval(() => {
    activeIndex = (activeIndex + 1) % testimonialCards.length;
    testimonialTrack.style.transform = `translateX(-${activeIndex * 100}%)`;
  }, 4200);
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

// Booking page: submit to API + optional WhatsApp
const bookingButton = document.getElementById("bk-submit");
const bookingWhatsAppButton = document.getElementById("bk-whatsapp");
if (bookingButton || bookingWhatsAppButton) {
  const nameInput = document.getElementById("bk-name");
  const phoneInput = document.getElementById("bk-phone");
  const serviceInput = document.getElementById("bk-service");
  const dateInput = document.getElementById("bk-date");
  const timeInput = document.getElementById("bk-time");
  const messageInput = document.getElementById("bk-message");
  const errorEl = document.getElementById("bk-error");
  const successEl = document.getElementById("bk-success");

  function getBookingFields() {
    return {
      name: (nameInput?.value || "").trim(),
      phone: (phoneInput?.value || "").trim(),
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
    setFormFeedback(errorEl, successEl);
    return true;
  }

  function openBookingWhatsApp(fields) {
    const lines = [
      "Hello Diverse Way Clinic! I'd like to book an appointment.",
      `Name: ${fields.name}`,
      `Phone: ${fields.phone}`,
      `Service: ${fields.service}`,
      `Date: ${fields.preferred_date || "Not specified"}`,
      `Time: ${fields.preferred_time || "Not specified"}`,
      `Message: ${fields.message || "—"}`,
    ];
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
        setFormFeedback(errorEl, successEl, { success: data.message });
        nameInput.value = "";
        phoneInput.value = "";
        if (serviceInput) serviceInput.selectedIndex = 0;
        if (dateInput) dateInput.value = "";
        if (timeInput) timeInput.value = "";
        if (messageInput) messageInput.value = "";
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
