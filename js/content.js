"use strict";

const WHATSAPP_ICON_PATH =
  "M12 2a10 10 0 0 0-8.78 14.78L2 22l5.36-1.2A10 10 0 1 0 12 2Zm0 18.5a8.48 8.48 0 0 1-4.33-1.18l-.3-.18l-3.18.7l.7-3.1l-.2-.32A8.5 8.5 0 1 1 12 20.5Zm4.83-6.34c-.26-.13-1.55-.76-1.8-.84c-.24-.09-.42-.13-.6.13c-.18.26-.68.84-.84 1.02c-.15.18-.3.2-.56.07c-.26-.13-1.1-.4-2.1-1.28c-.78-.7-1.3-1.55-1.45-1.8c-.15-.25-.02-.38.11-.5c.12-.12.26-.3.39-.45c.13-.15.18-.25.27-.42c.09-.18.04-.33-.02-.46c-.07-.13-.6-1.44-.82-1.97c-.22-.53-.45-.46-.6-.47h-.52c-.17 0-.46.06-.7.33c-.24.26-.92.9-.92 2.2c0 1.3.94 2.55 1.07 2.73c.13.18 1.84 2.8 4.45 3.93c.62.27 1.1.43 1.48.55c.62.2 1.18.17 1.62.1c.5-.08 1.55-.64 1.77-1.25c.22-.62.22-1.14.15-1.26c-.06-.12-.24-.2-.5-.33Z";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request to ${url} failed`);
  }
  return res.json();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

function formatDateLabel(isoDate) {
  if (!isoDate) {
    return "";
  }
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function whatsappIcon(extraClass) {
  return `<svg class="btn-icon${extraClass ? ` ${extraClass}` : ""}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${WHATSAPP_ICON_PATH}"/></svg>`;
}

function serviceCardHtml(service) {
  return `<article class="service-card" id="${escapeHtml(service.slug)}">
    <div class="service-card-media">
      <img src="${escapeHtml(service.photo_url)}" width="720" height="420" alt="${escapeHtml(service.name)}" loading="lazy">
    </div>
    <div class="service-card-body">
      <svg class="service-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${escapeHtml(service.icon_path)}"/></svg>
      <h3>${escapeHtml(service.name)}</h3>
      <p>${escapeHtml(service.short_description || "")}</p>
    </div>
  </article>`;
}

function serviceDetailCardHtml(service) {
  const treatItems = (service.treat_list || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<article class="service-detail-card ${escapeHtml(service.accent_class || "")}" id="${escapeHtml(service.slug)}">
    <div class="service-detail-photo-wrap">
      <img class="service-detail-photo" src="${escapeHtml(service.photo_url)}" alt="${escapeHtml(service.name)}" width="1400" height="600" loading="lazy">
    </div>
    <div class="service-detail-inner">
    <div class="service-detail-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="${escapeHtml(service.detail_icon_path)}"/></svg>
    </div>
    <div class="service-detail-body">
      <h2>${escapeHtml(service.name)}</h2>
      <p>${escapeHtml(service.description || "")}</p>
      <h3>What we treat</h3>
      <ul class="treat-list">${treatItems}</ul>
      <div class="service-book-actions">
        <a class="btn-primary service-book-btn" href="booking.html?service=${encodeURIComponent(service.name)}">Book online</a>
        <a class="btn-whatsapp service-book-btn" href="https://wa.me/9779845366417?text=${encodeURIComponent(service.whatsapp_message || "")}" aria-label="Book ${escapeHtml(service.name)} on WhatsApp">
          ${whatsappIcon()}
          WhatsApp
        </a>
      </div>
    </div>
    </div>
  </article>`;
}

function homeTeamCardHtml(member) {
  const hasPhoto = Boolean(member.photo_url);
  return `<article class="home-team-card${hasPhoto ? "" : " home-team-card--no-photo"}" role="listitem">
    ${hasPhoto ? `<div class="home-team-photo"><img src="${escapeHtml(member.photo_url)}" width="400" height="440" alt="${escapeHtml(member.name)}, ${escapeHtml(member.title || "")}" loading="lazy"></div>` : ""}
    <div class="home-team-text">
      <h3 class="home-team-name">${escapeHtml(member.name)}</h3>
      <p class="home-team-role">${escapeHtml(member.title || "")}</p>
      <p class="home-team-bio">${escapeHtml(member.bio_short || "")}</p>
    </div>
  </article>`;
}

function teamCardHtml(member) {
  const hasPhoto = Boolean(member.photo_url);
  return `<article class="team-card${hasPhoto ? "" : " team-card--no-photo"}" tabindex="0">
    <div class="team-inner">
      <div class="team-front">
        ${hasPhoto ? `<img loading="lazy" src="${escapeHtml(member.photo_url)}" alt="Portrait of ${escapeHtml(member.name)}, ${escapeHtml(member.title || "")}">` : ""}
        <div class="team-meta${hasPhoto ? "" : " team-meta--solo"}">
          <h3>${escapeHtml(member.name)}</h3>
          <p class="team-title">${escapeHtml(member.title || "")}</p>
          <p class="team-bio">${escapeHtml(member.bio || "")}</p>
        </div>
      </div>
      <div class="team-back">
        <h3>Connect</h3>
        <p>For appointments and queries:</p>
        <div class="team-links">
          <a class="team-link" href="https://wa.me/9779845366417?text=${encodeURIComponent(member.whatsapp_message || "")}">WhatsApp</a>
          <a class="team-link" href="contact.html">Contact Page</a>
        </div>
      </div>
    </div>
  </article>`;
}

function testimonialCardHtml(testimonial) {
  const stars = "★".repeat(Number(testimonial.stars) || 5);
  return `<article class="testimonial-card">
    <img class="testimonial-avatar" src="${escapeHtml(testimonial.avatar_url)}" width="80" height="80" alt="" loading="lazy">
    <p class="quote-mark">&ldquo;</p>
    <p>${escapeHtml(testimonial.quote)}</p>
    <p class="stars">${stars}</p>
    <h3>- ${escapeHtml(testimonial.attribution)}</h3>
  </article>`;
}

function blogCardHtml(post, { withCategory = false, withReadTime = false, hrefPrefix = "blog/" } = {}) {
  const catAttr = withCategory ? ` data-category="${escapeHtml(post.category)}"` : "";
  const meta = withReadTime
    ? `${formatDateLabel(post.published_at)} · ${escapeHtml(post.read_time)}`
    : formatDateLabel(post.published_at);
  const tagClass = post.tag_class ? ` ${escapeHtml(post.tag_class)}` : "";
  return `<a class="blog-card" href="${hrefPrefix}${encodeURIComponent(post.slug)}"${catAttr}>
    <div class="blog-card-media">
      <img src="${escapeHtml(post.hero_image_url)}" width="640" height="400" alt="${escapeHtml(post.hero_image_alt || "")}" loading="lazy">
    </div>
    <div class="blog-card-body">
      <span class="blog-tag${tagClass}">${escapeHtml(post.category_label)}</span>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.excerpt || "")}</p>
      <p class="blog-card-meta">${meta}</p>
    </div>
  </a>`;
}

function blogFeaturedHtml(post) {
  const tagClass = post.tag_class ? ` ${escapeHtml(post.tag_class)}` : "";
  return `<a class="blog-featured" href="blog/${encodeURIComponent(post.slug)}">
    <div class="blog-featured-media">
      <img src="${escapeHtml(post.hero_image_url)}" width="800" height="500" alt="${escapeHtml(post.hero_image_alt || "")}" loading="lazy">
    </div>
    <div class="blog-featured-copy">
      <span class="blog-tag${tagClass}">${escapeHtml(post.category_label)}</span>
      <h2>${escapeHtml(post.title)}</h2>
      <p>${escapeHtml(post.excerpt || "")}</p>
      <p class="blog-card-meta">${formatDateLabel(post.published_at)} · ${escapeHtml(post.read_time)}</p>
    </div>
  </a>`;
}

async function initServicesGrid() {
  const container = document.getElementById("services-grid");
  if (!container) {
    return;
  }
  const { data } = await fetchJson("/api/services");
  container.innerHTML = data.map(serviceCardHtml).join("");
}

async function initServiceDetailZigzag() {
  const container = document.getElementById("service-zigzag");
  if (!container) {
    return;
  }
  const { data } = await fetchJson("/api/services");
  container.innerHTML = data.map(serviceDetailCardHtml).join("");
}

async function initHomeTeamGrid() {
  const container = document.getElementById("home-team-grid");
  if (!container) {
    return;
  }
  const { data } = await fetchJson("/api/team");
  container.innerHTML = data.map(homeTeamCardHtml).join("");
}

async function initTeamGrid() {
  const container = document.getElementById("team-grid");
  if (!container) {
    return;
  }
  const { data } = await fetchJson("/api/team");
  container.innerHTML = data.map(teamCardHtml).join("");
}

async function initTestimonials() {
  const container = document.getElementById("testimonial-track");
  if (!container) {
    return;
  }
  const { data } = await fetchJson("/api/testimonials");
  container.innerHTML = data.map(testimonialCardHtml).join("");
  if (typeof window.initTestimonialCarousel === "function") {
    window.initTestimonialCarousel();
  }
}

async function initHomeBlogPreview() {
  const container = document.getElementById("home-blog-grid");
  if (!container) {
    return;
  }
  const { data } = await fetchJson("/api/blog?limit=3");
  container.innerHTML = data.map((post) => blogCardHtml(post, { hrefPrefix: "blog/" })).join("");
}

async function initBlogListing() {
  const featuredContainer = document.getElementById("blog-featured");
  const gridContainer = document.getElementById("blog-grid");
  if (!featuredContainer && !gridContainer) {
    return;
  }
  const { data } = await fetchJson("/api/blog");
  if (!data.length) {
    return;
  }

  const featured = data.find((post) => post.is_featured) || data[0];
  if (featuredContainer) {
    featuredContainer.innerHTML = blogFeaturedHtml(featured);
  }

  if (gridContainer) {
    gridContainer.innerHTML = data
      .map((post) => blogCardHtml(post, { withCategory: true, withReadTime: true, hrefPrefix: "blog/" }))
      .join("");
    if (typeof window.initBlogFilters === "function") {
      window.initBlogFilters();
    }
  }
}

async function initClinicHours() {
  const tableContainer = document.getElementById("working-hours-rows");
  const weekdayEl = document.getElementById("clinic-hours-weekday");
  const weekendEl = document.getElementById("clinic-hours-weekend");
  if (!tableContainer && !weekdayEl && !weekendEl) {
    return;
  }

  const { data } = await fetchJson("/api/settings");
  const hours = data.clinic_hours;
  if (!hours) {
    return;
  }

  if (tableContainer) {
    tableContainer.innerHTML = `
      <div class="hours-row" role="row">
        <div class="hours-cell" role="cell"><strong>${escapeHtml(hours.weekday_label)}</strong></div>
        <div class="hours-cell" role="cell">${escapeHtml(hours.weekday_hours)}</div>
      </div>
      <div class="hours-row" role="row">
        <div class="hours-cell" role="cell"><strong>${escapeHtml(hours.weekend_label)}</strong></div>
        <div class="hours-cell" role="cell">${escapeHtml(hours.weekend_hours)}</div>
      </div>`;
  }

  if (weekdayEl) {
    weekdayEl.innerHTML = `<strong>${escapeHtml(hours.weekday_label)}:</strong> ${escapeHtml(hours.weekday_hours)}`;
  }
  if (weekendEl) {
    weekendEl.innerHTML = `<strong>${escapeHtml(hours.weekend_label)}:</strong> ${escapeHtml(hours.weekend_hours)}`;
  }
}

Promise.all([
  initServicesGrid(),
  initServiceDetailZigzag(),
  initHomeTeamGrid(),
  initTeamGrid(),
  initTestimonials(),
  initHomeBlogPreview(),
  initBlogListing(),
  initClinicHours(),
]).catch((err) => console.error("Failed to load dynamic content", err));
