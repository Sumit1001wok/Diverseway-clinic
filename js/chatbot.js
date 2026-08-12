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
