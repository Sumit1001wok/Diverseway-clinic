"use strict";

const SITE_URL = process.env.SITE_URL || "https://www.diversewayclinic.com";
const WHATSAPP_ICON_PATH =
  "M12 2a10 10 0 0 0-8.78 14.78L2 22l5.36-1.2A10 10 0 1 0 12 2Zm0 18.5a8.48 8.48 0 0 1-4.33-1.18l-.3-.18l-3.18.7l.7-3.1l-.2-.32A8.5 8.5 0 1 1 12 20.5Zm4.83-6.34c-.26-.13-1.55-.76-1.8-.84c-.24-.09-.42-.13-.6.13c-.18.26-.68.84-.84 1.02c-.15.18-.3.2-.56.07c-.26-.13-1.1-.4-2.1-1.28c-.78-.7-1.3-1.55-1.45-1.8c-.15-.25-.02-.38.11-.5c.12-.12.26-.3.39-.45c.13-.15.18-.25.27-.42c.09-.18.04-.33-.02-.46c-.07-.13-.6-1.44-.82-1.97c-.22-.53-.45-.46-.6-.47h-.52c-.17 0-.46.06-.7.33c-.24.26-.92.9-.92 2.2c0 1.3.94 2.55 1.07 2.73c.13.18 1.84 2.8 4.45 3.93c.62.27 1.1.43 1.48.55c.62.2 1.18.17 1.62.1c.5-.08 1.55-.64 1.77-1.25c.22-.62.22-1.14.15-1.26c-.06-.12-.24-.2-.5-.33Z";

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

function renderRelatedLinks(relatedPosts) {
  if (!relatedPosts.length) {
    return "";
  }
  const links = relatedPosts
    .map(
      (post) =>
        `<a class="blog-related-link" href="/blog/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a>`
    )
    .join("\n              ");
  return `
          <div class="blog-related">
            <h2>Related articles</h2>
            <div class="blog-related-grid">
              ${links}
            </div>
          </div>`;
}

function renderBlogPostPage(post, relatedPosts) {
  const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;
  const heroImageUrl = `${SITE_URL}/${post.hero_image_url}`;
  const dateLabel = formatDateLabel(post.published_at);
  const tagClass = post.tag_class ? ` ${escapeHtml(post.tag_class)}` : "";

  return `<!doctype html>
<html lang="en-NP">
<head>
  <meta charset="UTF-8">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="shortcut icon" href="/favicon.ico">
  <meta name="theme-color" content="#ffffff">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow">
  <title>${escapeHtml(post.title)} | Diverse Way Clinic</title>
  <meta name="description" content="${escapeHtml(post.meta_description)}">
  <meta name="keywords" content="${escapeHtml(post.keywords)}">
  <meta name="geo.region" content="NP-BA">
  <meta name="geo.placename" content="Kathmandu, Nepal">
  <meta name="geo.position" content="27.6807767;85.3288076">
  <meta name="ICBM" content="27.6807767, 85.3288076">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:title" content="${escapeHtml(post.title)} | Diverse Way Clinic Kathmandu">
  <meta property="og:description" content="${escapeHtml(post.excerpt)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${heroImageUrl}">
  <meta property="og:locale" content="en_NP">
  <meta property="og:site_name" content="Diverse Way Clinic">
  <meta property="article:published_time" content="${escapeHtml(post.published_at)}">
  <meta property="article:section" content="${escapeHtml(post.category_label)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(post.title)}">
  <meta name="twitter:description" content="${escapeHtml(post.excerpt)}">
  <meta name="twitter:image" content="${heroImageUrl}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/animations.css">
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt,
        image: heroImageUrl,
        datePublished: post.published_at,
        dateModified: post.updated_at || post.published_at,
        author: { "@type": "Organization", name: "Diverse Way Clinic" },
        publisher: {
          "@type": "MedicalClinic",
          name: "Diverse Way Clinic",
          url: SITE_URL,
          telephone: "+977-9845366417",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Kathmandu",
            addressRegion: "Bagmati Province",
            addressCountry: "NP",
          },
        },
        mainEntityOfPage: canonicalUrl,
        keywords: post.keywords,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog.html` },
          { "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
        ],
      },
    ],
  })}
  </script>
</head>
<body>
  <header class="site-header">
    <nav class="navbar container">
      <a class="brand" href="/index.html" aria-label="Diverse Way Clinic home">
        <img class="brand-logo-img" src="/assets/images/logo.png" width="220" height="70" alt="Diverse Way Clinic logo Kathmandu Nepal" loading="eager" decoding="async">
        <span class="brand-name">Diverse Way Clinic</span>
      </a>
      <button class="menu-toggle" type="button" aria-label="Toggle navigation menu" aria-expanded="false"><span class="menu-toggle-bar"></span></button>
      <div class="nav-menu">
        <ul class="nav-links">
          <li><a class="nav-link" href="/index.html">Home</a></li>
          <li><a class="nav-link" href="/services.html">Services</a></li>
          <li><a class="nav-link" href="/blog.html">Blog</a></li>
          <li><a class="nav-link" href="/about.html">About</a></li>
          <li><a class="nav-link" href="/contact.html">Contact</a></li>
        </ul>
        <a class="nav-cta" href="/booking.html" aria-label="Book an appointment">Book Now</a>
      </div>
    </nav>
  </header>

  <main class="blog-post-page">
    <article class="blog-article reveal" itemscope itemtype="https://schema.org/BlogPosting">
      <div class="container blog-article-inner">
        <a class="blog-back-link" href="/blog.html">← Back to Blog</a>
        <header class="blog-article-header">
          <span class="blog-tag${tagClass}">${escapeHtml(post.category_label)}</span>
          <h1 itemprop="headline">${escapeHtml(post.title)}</h1>
          <p class="blog-article-meta"><time itemprop="datePublished" datetime="${escapeHtml(post.published_at)}">${escapeHtml(dateLabel)}</time> · ${escapeHtml(post.read_time)} · Kathmandu, Nepal</p>
        </header>
        <figure class="blog-article-hero">
          <img itemprop="image" src="/${post.hero_image_url}" width="1200" height="675" alt="${escapeHtml(post.hero_image_alt)}" loading="lazy">
        </figure>
        <div class="blog-article-content" itemprop="articleBody">
          ${post.body_html}
        </div>
        <footer class="blog-article-footer">
          <div class="blog-cta-inline">
            <h3>${escapeHtml(post.whatsapp_cta_heading)}</h3>
            <p>${escapeHtml(post.whatsapp_cta_text)}</p>
            <a class="btn-whatsapp" href="https://wa.me/9779845366417?text=${encodeURIComponent(post.whatsapp_cta_message || "")}" aria-label="${escapeHtml(post.whatsapp_cta_heading)} on WhatsApp">
              <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${WHATSAPP_ICON_PATH}"/></svg>
              ${escapeHtml(post.whatsapp_cta_heading)}
            </a>
          </div>${renderRelatedLinks(relatedPosts)}
        </footer>
      </div>
    </article>
  </main>

  <footer class="site-footer">
    <div class="container footer-grid">
      <section><h3 class="footer-title">Diverse Way Clinic</h3><p class="footer-text">Therapy &amp; counselling in Kathmandu, Nepal.</p></section>
      <section>
        <h3 class="footer-title">Quick Links</h3>
        <ul class="footer-links">
          <li><a class="footer-link" href="/services.html">Services</a></li>
          <li><a class="footer-link" href="/blog.html">Blog</a></li>
          <li><a class="footer-link" href="/booking.html">Book Appointment</a></li>
        </ul>
      </section>
      <section>
        <h3 class="footer-title">Contact</h3>
        <ul class="footer-contact-list">
          <li class="footer-contact-item">Phone: <a class="footer-link" href="tel:+9779845366417">9845366417</a></li>
          <li class="footer-contact-item">Kathmandu, Bagmati, Nepal</li>
        </ul>
      </section>
    </div>
    <div class="footer-bottom"><div class="container"><p>&copy; 2025 Diverse Way Clinic. All rights reserved.</p></div></div>
  </footer>
  <script src="/js/main.js"></script>
</body>
</html>
`;
}

function renderBlogNotFoundPage() {
  return `<!doctype html>
<html lang="en-NP">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, follow">
  <title>Article Not Found | Diverse Way Clinic</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <main class="container" style="padding: 6rem 1.5rem; text-align: center;">
    <h1>Article not found</h1>
    <p>This blog post may have been moved or unpublished.</p>
    <p><a href="/blog.html">Back to Blog</a></p>
  </main>
</body>
</html>
`;
}

module.exports = { renderBlogPostPage, renderBlogNotFoundPage };
