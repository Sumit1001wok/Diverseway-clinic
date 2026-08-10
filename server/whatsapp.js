"use strict";

// Sends a WhatsApp notification to the clinic's own staff number(s) via the
// official Meta WhatsApp Business Cloud API whenever a booking, contact
// message, or screening callback request comes in from the website. No-ops
// (logs nothing, throws nothing) until WHATSAPP_ACCESS_TOKEN and
// WHATSAPP_PHONE_NUMBER_ID are set, so it's safe to deploy before those are
// configured. See README/deploy notes for how to obtain them.

const GRAPH_API_VERSION = "v21.0";

function isConfigured() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

function getNotifyNumbers() {
  return (process.env.WHATSAPP_NOTIFY_NUMBERS || "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

// WhatsApp template parameters may not contain newlines/tabs or long runs of
// spaces, so free-text fields (contact messages, notes) are flattened to one line.
function sanitizeParam(value, maxLength) {
  const cleaned = String(value ?? "")
    .replace(/[\n\r\t]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
  return (cleaned || "-").slice(0, maxLength);
}

async function sendTemplateMessage(to, bodyParams) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "new_website_lead";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANG || "en";

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: "body",
            parameters: bodyParams.map((text) => ({ type: "text", text })),
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`WhatsApp API ${res.status}: ${body}`);
  }
}

async function notifyClinic(kind, { name, contact, details }) {
  if (!isConfigured()) {
    return;
  }
  const numbers = getNotifyNumbers();
  if (!numbers.length) {
    return;
  }

  const bodyParams = [
    sanitizeParam(kind, 40),
    sanitizeParam(name, 80),
    sanitizeParam(contact, 60),
    sanitizeParam(details, 300),
  ];

  await Promise.all(
    numbers.map((to) =>
      sendTemplateMessage(to, bodyParams).catch((err) => {
        console.error(`Failed to send WhatsApp notification to ${to}:`, err.message);
      })
    )
  );
}

function notifyNewBooking(booking) {
  const details =
    [booking.service, [booking.preferred_date, booking.preferred_time].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(" - ") || "No preferred time given";

  return notifyClinic("booking request", {
    name: booking.name,
    contact: booking.phone,
    details,
  }).catch(() => {});
}

function notifyNewContact(contact) {
  return notifyClinic("contact message", {
    name: contact.name || "Anonymous",
    contact: contact.email || "No email given",
    details: `${contact.subject}: ${contact.message}`,
  }).catch(() => {});
}

function notifyScreeningCallback(screening) {
  return notifyClinic("screening callback request", {
    name: screening.contact_name,
    contact: screening.contact_phone,
    details: `${screening.category_label || screening.category} - ${screening.conclusion}`,
  }).catch(() => {});
}

module.exports = {
  isConfigured,
  notifyNewBooking,
  notifyNewContact,
  notifyScreeningCallback,
};
