"use strict";

const blogFilterButtons = document.querySelectorAll(".blog-filter-btn");
const blogCards = Array.from(document.querySelectorAll(".blog-card[data-category]"));

function applyBlogFilter(filter) {
  blogCards.forEach((card) => {
    const category = card.dataset.category;
    const show = filter === "all" || category === filter;
    card.classList.toggle("is-hidden", !show);
  });
}

if (blogFilterButtons.length > 0 && blogCards.length > 0) {
  blogFilterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      blogFilterButtons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      btn.setAttribute("aria-selected", "true");
      applyBlogFilter(btn.dataset.filter || "all");
    });
  });

  const defaultFilter = document.querySelector(".blog-filter-btn.is-active");
  if (defaultFilter) {
    defaultFilter.setAttribute("aria-pressed", "true");
    defaultFilter.setAttribute("aria-selected", "true");
  }
}
