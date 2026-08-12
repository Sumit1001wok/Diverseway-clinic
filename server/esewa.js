"use strict";

const crypto = require("crypto");

// Defaults are eSewa's own published sandbox/UAT credentials — safe to ship
// as defaults because they only work against eSewa's test environment, not
// real money. Going live is purely an env var swap (see .env.example) once
// a real eSewa merchant account exists; no code changes needed.
const PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
const SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
const FORM_URL = process.env.ESEWA_FORM_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const STATUS_CHECK_URL = process.env.ESEWA_STATUS_CHECK_URL || "https://rc.esewa.com.np/api/epay/transaction/status/";

const ADVANCE_PAYMENT_AMOUNT = Number(process.env.ADVANCE_PAYMENT_AMOUNT) || 200;

function sign(message) {
  return crypto.createHmac("sha256", SECRET_KEY).update(message).digest("base64");
}

// transactionUuid must be unique per payment attempt — a booking reference
// alone isn't enough if a patient retries after a failed/abandoned attempt,
// so callers should pass a fresh uuid per attempt, not the booking reference.
function buildPaymentForm({ amount, transactionUuid, successUrl, failureUrl }) {
  const totalAmount = amount;
  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${PRODUCT_CODE}`;
  const signature = sign(message);

  return {
    formUrl: FORM_URL,
    fields: {
      amount: String(amount),
      tax_amount: "0",
      total_amount: String(totalAmount),
      transaction_uuid: transactionUuid,
      product_code: PRODUCT_CODE,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: signedFieldNames,
      signature,
    },
  };
}

// The success redirect carries a base64 `data` query param — this is
// untrusted client-supplied input, so its signature must be verified before
// trusting anything in it, and the real status must still be re-checked
// server-to-server via checkTransactionStatus (never trust the redirect alone).
function decodeAndVerifyCallback(base64Data) {
  let payload;
  try {
    payload = JSON.parse(Buffer.from(base64Data, "base64").toString("utf8"));
  } catch {
    return null;
  }

  const { signed_field_names: signedFieldNames, signature } = payload;
  if (!signedFieldNames || !signature) {
    return null;
  }

  const message = signedFieldNames
    .split(",")
    .map((field) => `${field}=${payload[field]}`)
    .join(",");

  const expectedSignature = sign(message);
  if (expectedSignature !== signature) {
    return null;
  }

  return payload;
}

async function checkTransactionStatus({ totalAmount, transactionUuid }) {
  const url = new URL(STATUS_CHECK_URL);
  url.searchParams.set("product_code", PRODUCT_CODE);
  url.searchParams.set("total_amount", String(totalAmount));
  url.searchParams.set("transaction_uuid", transactionUuid);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`eSewa status check failed: ${res.status}`);
  }
  return res.json();
}

module.exports = {
  ADVANCE_PAYMENT_AMOUNT,
  buildPaymentForm,
  decodeAndVerifyCallback,
  checkTransactionStatus,
};
