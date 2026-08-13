"use strict";

(function () {
  const container = document.getElementById("screening-widget");
  if (!container || !window.SCREENING_CATEGORIES) {
    return;
  }

  const CATEGORIES = window.SCREENING_CATEGORIES;
  const TIERS = window.SCREENING_TIERS;
  const WHATSAPP_PHONE = "9779845366417";

  const TIER_EXPLANATIONS = {
    ontrack:
      "Based on your answers, things look on track for now. Keep an eye on progress, and reach out anytime you have a concern.",
    monitor:
      "A few things are worth watching. We recommend rescreening in 4–6 weeks, or booking a consultation sooner if you're concerned.",
    consult: "Based on your answers, it's worth speaking with a speech-language pathologist to review this further.",
    refer: "Based on your answers, we recommend booking an assessment with a speech-language pathologist soon.",
  };

  const state = {
    step: "category",
    category: null,
    ageBand: null,
    answers: {},
    questionIndex: 0,
    notes: "",
    tier: null,
    submitted: false,
    submissionId: null,
  };

  let advanceTimer = null;

  function clearAdvanceTimer() {
    if (advanceTimer) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }
  }

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

  function currentQuestions() {
    return state.category.getQuestions(state.ageBand, state.answers);
  }

  function stepperHtml() {
    const hasAgeBand = Boolean(state.category && state.category.ageBands);
    const labels = hasAgeBand ? ["Topic", "Age", "Questions", "Result"] : ["Topic", "Questions", "Result"];
    let activeIndex = 0;
    if (state.step === "ageBand") activeIndex = 1;
    else if (state.step === "questions") activeIndex = hasAgeBand ? 2 : 1;
    else if (state.step === "result") activeIndex = labels.length - 1;

    return `
      <div class="screening-stepper" role="presentation">
        ${labels
          .map((label, i) => {
            const done = i < activeIndex;
            const active = i === activeIndex;
            return `
            <div class="screening-stepper-item${done ? " is-done" : ""}${active ? " is-active" : ""}">
              <span class="screening-stepper-dot">${done ? "✓" : i + 1}</span>
              <span class="screening-stepper-label">${escapeHtml(label)}</span>
            </div>
            ${i < labels.length - 1 ? '<span class="screening-stepper-line' + (done ? " is-done" : "") + '"></span>' : ""}`;
          })
          .join("")}
      </div>
    `;
  }

  function render() {
    clearAdvanceTimer();

    if (state.step === "category") renderCategoryStep();
    else if (state.step === "ageBand") renderAgeBandStep();
    else if (state.step === "questions") renderQuestionsStep();
    else renderResultStep();

    const stepEl = container.querySelector(".screening-step");
    if (stepEl) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => stepEl.classList.add("is-in"));
      });
    }
  }

  function renderCategoryStep() {
    container.innerHTML = `
      ${stepperHtml()}
      <div class="screening-step" data-step="category">
        <div class="screening-category-grid">
          ${CATEGORIES.map(
            (c) => `
            <button type="button" class="screening-category-card" data-category="${c.id}">
              <h3>${escapeHtml(c.label)}</h3>
              <p>${escapeHtml(c.description)}</p>
              <span class="screening-audience">${escapeHtml(c.audience)}</span>
            </button>`
          ).join("")}
        </div>
      </div>
    `;
    container.querySelectorAll("[data-category]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.category = CATEGORIES.find((c) => c.id === btn.dataset.category);
        state.answers = {};
        state.ageBand = null;
        state.questionIndex = 0;
        state.step = state.category.ageBands ? "ageBand" : "questions";
        render();
      });
    });
  }

  function renderAgeBandStep() {
    container.innerHTML = `
      ${stepperHtml()}
      <div class="screening-step" data-step="ageband">
        <button type="button" class="screening-back" data-back>← Back</button>
        <h3 class="screening-step-title">${escapeHtml(state.category.label)}</h3>
        <p class="muted">How old is your child?</p>
        <div class="screening-ageband-grid">
          ${state.category.ageBands
            .map((b) => `<button type="button" class="screening-ageband-card" data-ageband="${b.id}">${escapeHtml(b.label)}</button>`)
            .join("")}
        </div>
      </div>
    `;
    container.querySelector("[data-back]").addEventListener("click", () => {
      state.step = "category";
      render();
    });
    container.querySelectorAll("[data-ageband]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.ageBand = btn.dataset.ageband;
        state.questionIndex = 0;
        state.step = "questions";
        render();
      });
    });
  }

  function progressBarHtml(index, total, label) {
    const percent = total > 0 ? Math.round((index / total) * 100) : 0;
    const text = label || `Question ${Math.min(index + 1, total)} of ${total}`;
    return `
      <div class="screening-progress-bar">
        <div class="screening-progress-fill" style="width:${percent}%"></div>
      </div>
      <p class="screening-progress-label">${escapeHtml(text)}</p>
    `;
  }

  function goToQuestion(index) {
    state.questionIndex = index;
    render();
  }

  function renderQuestionsStep() {
    const questions = currentQuestions();

    if (state.questionIndex >= questions.length) {
      renderNotesStep(questions.length);
      return;
    }

    const q = questions[state.questionIndex];

    if (q.type === "multiselect") {
      renderMultiselectQuestion(q, questions.length);
      return;
    }

    const value = state.answers[q.id];

    container.innerHTML = `
      ${stepperHtml()}
      <div class="screening-step" data-step="questions">
        <button type="button" class="screening-back" data-back>← Back</button>
        ${progressBarHtml(state.questionIndex, questions.length)}
        <fieldset class="screening-single-question" data-question="${q.id}">
          <legend class="screening-question-heading">${escapeHtml(q.label)}</legend>
          <div class="screening-options screening-options-large">
            ${q.options
              .map(
                (opt) => `
              <button type="button" class="screening-option-btn${value === opt.value ? " is-active" : ""}" data-value="${opt.value}">${escapeHtml(opt.label)}</button>`
              )
              .join("")}
          </div>
        </fieldset>
      </div>
    `;

    container.querySelector("[data-back]").addEventListener("click", () => {
      clearAdvanceTimer();
      if (state.questionIndex === 0) {
        state.step = state.category.ageBands ? "ageBand" : "category";
      } else {
        state.questionIndex -= 1;
      }
      render();
    });

    container.querySelectorAll(".screening-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        clearAdvanceTimer();
        state.answers[q.id] = btn.dataset.value;

        container.querySelectorAll(".screening-option-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        advanceTimer = setTimeout(() => {
          advanceTimer = null;
          goToQuestion(state.questionIndex + 1);
        }, 320);
      });
    });
  }

  // Concerns can overlap (e.g. a child both "doesn't make sentences" and
  // "doesn't respond to name"), so this question type lets several options
  // stay selected at once instead of auto-advancing on the first tap.
  function renderMultiselectQuestion(q, totalQuestions) {
    const noneValue = "no_concern";
    const selected = Array.isArray(state.answers[q.id]) ? state.answers[q.id] : [];

    container.innerHTML = `
      ${stepperHtml()}
      <div class="screening-step" data-step="questions">
        <button type="button" class="screening-back" data-back>← Back</button>
        ${progressBarHtml(state.questionIndex, totalQuestions)}
        <fieldset class="screening-single-question" data-question="${q.id}">
          <legend class="screening-question-heading">${escapeHtml(q.label)}</legend>
          <p class="muted screening-multiselect-hint">Select all that apply.</p>
          <div class="screening-options screening-options-large">
            ${q.options
              .map(
                (opt) => `
              <button type="button" class="screening-option-btn${selected.includes(opt.value) ? " is-active" : ""}" data-value="${opt.value}">${escapeHtml(opt.label)}</button>`
              )
              .join("")}
          </div>
          <div class="screening-form-actions">
            <button type="button" class="btn-primary btn-primary-large" data-continue${selected.length ? "" : " disabled"}>Continue</button>
          </div>
        </fieldset>
      </div>
    `;

    container.querySelector("[data-back]").addEventListener("click", () => {
      if (state.questionIndex === 0) {
        state.step = state.category.ageBands ? "ageBand" : "category";
      } else {
        state.questionIndex -= 1;
      }
      render();
    });

    container.querySelectorAll(".screening-option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.value;
        let current = Array.isArray(state.answers[q.id]) ? [...state.answers[q.id]] : [];

        if (val === noneValue) {
          current = current.includes(noneValue) ? [] : [noneValue];
        } else {
          current = current.filter((v) => v !== noneValue);
          current = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
        }

        state.answers[q.id] = current;
        render();
      });
    });

    container.querySelector("[data-continue]").addEventListener("click", () => {
      if (!(state.answers[q.id] || []).length) {
        return;
      }
      goToQuestion(state.questionIndex + 1);
    });
  }

  function renderNotesStep(totalQuestions) {
    container.innerHTML = `
      ${stepperHtml()}
      <div class="screening-step" data-step="notes">
        <button type="button" class="screening-back" data-back>← Back</button>
        ${progressBarHtml(totalQuestions, totalQuestions, "Almost done")}
        <h3 class="screening-question-heading">Anything else you'd like to tell us?</h3>
        <p class="muted">Optional — helps our team prepare before reaching out.</p>
        <label class="field field-full screening-notes-field">
          <textarea id="screening-notes" rows="4" placeholder="Optional context for our team...">${escapeHtml(state.notes || "")}</textarea>
        </label>
        <div class="screening-form-actions">
          <button type="button" class="btn-primary btn-primary-large" data-see-results>See my results</button>
        </div>
      </div>
    `;

    container.querySelector("[data-back]").addEventListener("click", () => {
      goToQuestion(totalQuestions - 1);
    });

    container.querySelector("[data-see-results]").addEventListener("click", () => {
      state.notes = document.getElementById("screening-notes").value.trim();
      state.tier = state.category.evaluate(state.answers, state.ageBand);
      state.submitted = false;
      state.step = "result";
      render();
    });
  }

  async function submitScreening() {
    try {
      const res = await fetch("/api/screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: state.category.id,
          category_label: state.category.label,
          age_band: state.ageBand,
          answers: state.answers,
          notes: state.notes,
          conclusion: state.tier,
        }),
      });
      const data = await res.json().catch(() => ({}));
      state.submissionId = data.id || null;
    } catch (err) {
      console.error("Failed to submit screening", err);
    }
  }

  async function submitScreeningContact(contact) {
    if (!state.submissionId) {
      return;
    }
    try {
      await fetch(`/api/screening/${state.submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: contact.name,
          contact_phone: contact.phone,
        }),
      });
    } catch (err) {
      console.error("Failed to submit screening contact info", err);
    }
  }

  function renderResultStep() {
    const tierInfo = TIERS[state.tier];
    const bookingUrl = `booking.html?service=${encodeURIComponent(state.category.bookingService)}`;
    const waMessage = `Hi, I just completed the "${state.category.label}" screening on your website and got the result: ${tierInfo.label}. I'd like to know more.`;
    const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(waMessage)}`;

    container.innerHTML = `
      ${stepperHtml()}
      <div class="screening-step screening-result" data-step="result">
        <div class="screening-result-badge ${tierInfo.className}">
          <span class="screening-result-emoji">${tierInfo.emoji}</span>
          <span>${escapeHtml(tierInfo.label)}</span>
        </div>
        <p class="screening-result-explain">${escapeHtml(TIER_EXPLANATIONS[state.tier])}</p>
        <div class="screening-result-ctas">
          <a class="btn-primary btn-primary-large" href="${bookingUrl}">Book Online</a>
          <a class="btn-whatsapp btn-whatsapp-large" href="${waUrl}">
            <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.78 14.78L2 22l5.36-1.2A10 10 0 1 0 12 2Zm0 18.5a8.48 8.48 0 0 1-4.33-1.18l-.3-.18l-3.18.7l.7-3.1l-.2-.32A8.5 8.5 0 1 1 12 20.5Zm4.83-6.34c-.26-.13-1.55-.76-1.8-.84c-.24-.09-.42-.13-.6.13c-.18.26-.68.84-.84 1.02c-.15.18-.3.2-.56.07c-.26-.13-1.1-.4-2.1-1.28c-.78-.7-1.3-1.55-1.45-1.8c-.15-.25-.02-.38.11-.5c.12-.12.26-.3.39-.45c.13-.15.18-.25.27-.42c.09-.18.04-.33-.02-.46c-.07-.13-.6-1.44-.82-1.97c-.22-.53-.45-.46-.6-.47h-.52c-.17 0-.46.06-.7.33c-.24.26-.92.9-.92 2.2c0 1.3.94 2.55 1.07 2.73c.13.18 1.84 2.8 4.45 3.93c.62.27 1.1.43 1.48.55c.62.2 1.18.17 1.62.1c.5-.08 1.55-.64 1.77-1.25c.22-.62.22-1.14.15-1.26c-.06-.12-.24-.2-.5-.33Z"/></svg>
            WhatsApp Us
          </a>
        </div>

        <div class="screening-callback booking-card">
          <h4>Want us to call you back?</h4>
          <p class="muted">Leave your details and our team will reach out — no obligation.</p>
          <form id="screening-callback-form" class="screening-callback-form">
            <div class="form-grid field-grid">
              <label class="field">
                <span>Your name</span>
                <input id="screening-contact-name" type="text" placeholder="Your full name">
              </label>
              <label class="field">
                <span>Phone</span>
                <input id="screening-contact-phone" type="tel" placeholder="98XXXXXXXX">
              </label>
            </div>
            <button type="submit" class="btn-outline btn-sm">Request a callback</button>
            <p id="screening-callback-success" class="form-success" role="status" hidden>Thanks — we'll be in touch soon.</p>
          </form>
        </div>

        <p class="screening-disclaimer muted">This is a screening aid, not a medical diagnosis. A licensed speech-language pathologist can give you a full assessment.</p>
        <button type="button" class="screening-restart" data-restart>Screen something else →</button>
      </div>
    `;

    if (!state.submitted) {
      state.submitted = true;
      submitScreening();
    }

    container.querySelector("[data-restart]").addEventListener("click", () => {
      state.step = "category";
      state.category = null;
      state.ageBand = null;
      state.answers = {};
      state.questionIndex = 0;
      state.notes = "";
      state.tier = null;
      state.submitted = false;
      state.submissionId = null;
      render();
    });

    if (typeof window.attachLiveValidation === "function") {
      window.attachLiveValidation(document.getElementById("screening-contact-name"), window.VALIDATORS.nonEmpty);
      window.attachLiveValidation(document.getElementById("screening-contact-phone"), window.VALIDATORS.phone);
    }

    const callbackForm = document.getElementById("screening-callback-form");
    callbackForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = document.getElementById("screening-contact-name").value.trim();
      const phone = document.getElementById("screening-contact-phone").value.trim();
      if (!name || !phone) {
        return;
      }
      await submitScreeningContact({ name, phone });
      document.getElementById("screening-callback-success").hidden = false;
      callbackForm.querySelector('button[type="submit"]').disabled = true;
    });
  }

  render();
})();
