"use strict";

// Self-contained floating chat widget — no dependencies on other page
// scripts, so the same file works unchanged on every public page and both
// the patient and admin dashboards. Injects its own markup rather than
// requiring per-page HTML, matching how the WhatsApp float button and
// back-to-top button are already added in js/main.js.
(function () {
  if (document.querySelector(".chatbot-float")) {
    return;
  }

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

  const messages = [];
  let sending = false;

  const floatBtn = document.createElement("button");
  floatBtn.type = "button";
  floatBtn.className = "chatbot-float";
  floatBtn.setAttribute("aria-label", "Chat with Diverse Way Clinic assistant");
  floatBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 5.94 2 10.8c0 2.55 1.24 4.84 3.22 6.44-.1 1.06-.5 2.42-1.42 3.76 0 0 2.42-.28 4.4-1.68 1.19.4 2.48.62 3.8.62 5.52 0 10-3.94 10-8.8S17.52 2 12 2Z"/></svg>`;

  const panel = document.createElement("div");
  panel.className = "chatbot-panel hidden";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat with Diverse Way Clinic assistant");
  panel.innerHTML = `
    <div class="chatbot-header">
      <span>Diverse Way Assistant</span>
      <button type="button" class="chatbot-close" aria-label="Close chat">&times;</button>
    </div>
    <div class="chatbot-messages" id="chatbot-messages"></div>
    <form class="chatbot-input-row" id="chatbot-form">
      <input type="text" id="chatbot-input" placeholder="Ask about services, hours, booking…" autocomplete="off">
      <button type="submit" class="chatbot-send" aria-label="Send message">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2 21l21-9L2 3v7l15 2-15 2v7Z"/></svg>
      </button>
    </form>
  `;

  document.body.appendChild(floatBtn);
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector("#chatbot-messages");
  const form = panel.querySelector("#chatbot-form");
  const input = panel.querySelector("#chatbot-input");
  const closeBtn = panel.querySelector(".chatbot-close");

  // Draggable launcher button — position persists across visits. Until the
  // user drags it once, it stays on the CSS default (bottom-left, with its
  // own mobile breakpoint), so nothing here overrides layout unnecessarily.
  const POSITION_KEY = "chatbot-position";
  const DRAG_THRESHOLD = 6;
  const EDGE_GAP = 8;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  function loadPosition() {
    try {
      const raw = localStorage.getItem(POSITION_KEY);
      const pos = raw ? JSON.parse(raw) : null;
      if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
        return pos;
      }
    } catch {
      // ignore malformed/unavailable storage
    }
    return null;
  }

  function savePosition(pos) {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
    } catch {
      // storage unavailable (private browsing, quota) — position just won't persist
    }
  }

  function positionPanel() {
    if (panel.classList.contains("hidden")) {
      return;
    }
    const btnRect = floatBtn.getBoundingClientRect();
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const gap = 12;

    let left = clamp(btnRect.left, EDGE_GAP, window.innerWidth - panelWidth - EDGE_GAP);

    const spaceAbove = btnRect.top - gap;
    const spaceBelow = window.innerHeight - btnRect.bottom - gap;
    let top = spaceAbove >= panelHeight || spaceAbove >= spaceBelow
      ? btnRect.top - gap - panelHeight
      : btnRect.bottom + gap;
    top = clamp(top, EDGE_GAP, window.innerHeight - panelHeight - EDGE_GAP);

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function applyPosition(pos) {
    const rect = floatBtn.getBoundingClientRect();
    const x = clamp(pos.x, EDGE_GAP, window.innerWidth - rect.width - EDGE_GAP);
    const y = clamp(pos.y, EDGE_GAP, window.innerHeight - rect.height - EDGE_GAP);
    floatBtn.style.left = `${x}px`;
    floatBtn.style.top = `${y}px`;
    floatBtn.style.right = "auto";
    floatBtn.style.bottom = "auto";
    positionPanel();
  }

  const storedPosition = loadPosition();
  if (storedPosition) {
    applyPosition(storedPosition);
  }

  window.addEventListener("resize", () => {
    // Only reclamp if the button has ever been dragged from its CSS
    // default — otherwise let the stylesheet's own mobile breakpoint handle it.
    if (!floatBtn.style.left) {
      return;
    }
    const rect = floatBtn.getBoundingClientRect();
    applyPosition({ x: rect.left, y: rect.top });
  });

  let dragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let btnStartX = 0;
  let btnStartY = 0;

  floatBtn.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    dragging = true;
    dragMoved = false;
    const rect = floatBtn.getBoundingClientRect();
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    btnStartX = rect.left;
    btnStartY = rect.top;
    floatBtn.setPointerCapture(event.pointerId);
  });

  floatBtn.addEventListener("pointermove", (event) => {
    if (!dragging) {
      return;
    }
    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    if (!dragMoved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      dragMoved = true;
      floatBtn.classList.add("chatbot-float-dragging");
    }
    if (dragMoved) {
      applyPosition({ x: btnStartX + dx, y: btnStartY + dy });
    }
  });

  function endDrag(event) {
    if (!dragging) {
      return;
    }
    dragging = false;
    floatBtn.classList.remove("chatbot-float-dragging");
    if (dragMoved) {
      const rect = floatBtn.getBoundingClientRect();
      savePosition({ x: rect.left, y: rect.top });
    }
    if (floatBtn.hasPointerCapture(event.pointerId)) {
      floatBtn.releasePointerCapture(event.pointerId);
    }
  }

  floatBtn.addEventListener("pointerup", endDrag);
  floatBtn.addEventListener("pointercancel", endDrag);

  function appendBubble(role, text) {
    const bubble = document.createElement("div");
    bubble.className = `chatbot-bubble chatbot-bubble-${role}`;
    bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function openPanel() {
    panel.classList.remove("hidden");
    positionPanel();
    if (!messages.length) {
      appendBubble(
        "assistant",
        "Hi! I'm the Diverse Way Clinic assistant. Ask me about our services, hours, or how to book an appointment."
      );
    }
    input.focus();
  }

  function closePanel() {
    panel.classList.add("hidden");
  }

  floatBtn.addEventListener("click", () => {
    if (dragMoved) {
      dragMoved = false;
      return;
    }
    if (panel.classList.contains("hidden")) {
      openPanel();
    } else {
      closePanel();
    }
  });

  closeBtn.addEventListener("click", closePanel);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || sending) {
      return;
    }

    input.value = "";
    appendBubble("user", text);
    messages.push({ role: "user", content: text });

    sending = true;
    const typingBubble = appendBubble("assistant", "…");
    typingBubble.classList.add("chatbot-bubble-typing");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json().catch(() => ({}));

      typingBubble.remove();

      if (!res.ok) {
        appendBubble("assistant", data.error || "Something went wrong. Please try again or message us on WhatsApp.");
        return;
      }

      appendBubble("assistant", data.reply);
      messages.push({ role: "assistant", content: data.reply });
    } catch {
      typingBubble.remove();
      appendBubble("assistant", "Could not reach the chat right now. Please try again or message us on WhatsApp.");
    } finally {
      sending = false;
    }
  });
})();
