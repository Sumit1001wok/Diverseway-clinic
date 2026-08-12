"use strict";

const { listServices, listSettings } = require("./db");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const MAX_OUTPUT_TOKENS = 500;
// Bounds input token growth (and thus rate-limit usage on the free tier) per
// request — a support chat doesn't need the full history, just enough for
// the model to stay on topic.
const MAX_HISTORY_MESSAGES = 10;

function isConfigured() {
  return Boolean(GEMINI_API_KEY);
}

async function buildSystemPrompt() {
  const [services, settings] = await Promise.all([
    listServices({ activeOnly: true }),
    listSettings(),
  ]);
  const hours = settings.clinic_hours || {};

  const serviceLines = services
    .map((s) => `- ${s.name}: ${s.short_description || ""}`)
    .join("\n");

  return `You are the friendly virtual assistant for Diverse Way Clinic, a speech, occupational, and behaviour therapy clinic in Shankhamul, Lalitpur, Kathmandu, Nepal.

Services offered:
${serviceLines || "- (see the Services page for the current list)"}

Clinic hours: ${hours.weekday_label || "Mon-Sat"} ${hours.weekday_hours || "9 AM - 6 PM"}; ${hours.weekend_label || "Sunday"} ${hours.weekend_hours || "by appointment"}.

Contact: WhatsApp/phone 9845366417 or 9841362404. Online booking is at /booking.html (requires a free patient account — a booking button on the page opens registration/login). A free 2-minute speech/language screening tool is on the homepage.

Guidelines:
- Be warm, concise, and helpful. Keep replies to a few sentences, not long essays.
- You are NOT a substitute for professional clinical judgment — never diagnose a condition or tell someone what's "wrong". For any specific concern about a child or patient's symptoms, encourage them to try the free screening tool or book a consultation rather than assessing it yourself.
- Encourage booking an appointment or messaging on WhatsApp when that's the natural next step.
- If asked something unrelated to the clinic or therapy in general, briefly and politely redirect to how you can help with clinic-related questions.`;
}

// Gemini uses "model" (not "assistant") as the role for the AI's own turns.
function toGeminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

async function getReply(messages) {
  if (!isConfigured()) {
    const error = new Error("Chat is not configured yet.");
    error.code = "NOT_CONFIGURED";
    throw error;
  }

  const systemPrompt = await buildSystemPrompt();
  const trimmedMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: toGeminiContents(trimmedMessages),
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("");

  return text || "Sorry, I couldn't come up with a response — please try again or message us on WhatsApp.";
}

module.exports = { isConfigured, getReply };
