"use strict";

// AI-drafted narrative "Speech and Language Assessment Report" generated
// from a therapist's structured intake assessment (see js/assessment-data.js
// for the intake field list). Reuses the same Gemini setup as server/chatbot.js
// but as its own module since the prompt/response shape is unrelated to chat.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const MAX_OUTPUT_TOKENS = 3000;

function isConfigured() {
  return Boolean(GEMINI_API_KEY);
}

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    background: { type: "string" },
    evaluation: { type: "string" },
    materials: { type: "array", items: { type: "string" } },
    clinicalFindings: {
      type: "object",
      properties: {
        voiceFluencyOralMotor: { type: "string" },
        language: { type: "string" },
        pragmaticSocialPlay: { type: "string" },
        regulation: { type: "string" },
      },
      required: ["voiceFluencyOralMotor", "language", "pragmaticSocialPlay", "regulation"],
    },
    recommendations: {
      type: "object",
      properties: {
        home: { type: "array", items: { type: "string" } },
        therapy: { type: "array", items: { type: "string" } },
      },
      required: ["home", "therapy"],
    },
    goals: { type: "array", items: { type: "string" } },
  },
  required: ["background", "evaluation", "materials", "clinicalFindings", "recommendations", "goals"],
};

// Intake fields worth feeding to the model, in the order the printed report
// reads best — label text matches js/assessment-data.js field labels so a
// clinician cross-reading the intake form and the prompt sees the same wording.
const INTAKE_FIELD_ORDER = [
  ["diagnosis", "Existing/referral diagnosis"],
  ["complaint", "Presenting complaint"],
  ["birth_history", "Birth history"],
  ["motor_milestone", "Motor milestones"],
  ["family_history", "Family history"],
  ["medication", "Medication"],
  ["therapy_history", "Therapy history/School"],
  ["iep", "IEP"],
  ["environmental_modification", "Environmental modification"],
  ["evaluation_mode", "Evaluation mode (in person/teletherapy)"],
  ["observation_in_session", "Observation in session"],
  ["oromotor", "Oromotor / Voice / Fluency / Articulation"],
  ["language_exposed", "Language(s) exposed to"],
  ["content_listened", "Content listened to / exposed to"],
  ["language_understanding", "Language understanding"],
  ["follows_command", "Follows commands"],
  ["question_answer", "Question/answer ability"],
  ["mode_of_communication", "Mode of communication"],
  ["communication_initiation", "Communication initiation"],
  ["language_development_type", "Type of language development"],
  ["variety", "Variety"],
  ["grammar", "Grammar"],
  ["self_advocacy", "Self advocacy"],
  ["play", "Play"],
  ["imitation_joint_attention", "Imitation and joint attention"],
  ["social_communication", "Social communication"],
  ["sensory_differences", "Sensory differences"],
  ["regulation", "Regulation"],
  ["provisional_diagnosis", "Provisional diagnosis"],
  ["recommendation", "Therapist's recommendation notes"],
];

function buildPrompt(assessment) {
  const intakeLines = INTAKE_FIELD_ORDER.filter(([key]) => (assessment[key] || "").trim())
    .map(([key, label]) => `${label}: ${assessment[key].trim()}`)
    .join("\n");

  return `You are a clinical documentation assistant for Diverse Way Clinic, a speech-language therapy clinic in Lalitpur, Nepal. Write a professional "Speech and Language Assessment Report" for the client below, based strictly on the intake notes provided.

Client: ${assessment.client_name}
Age/Gender: ${assessment.age_gender || "not provided"}

Intake notes from the assessing clinician:
${intakeLines || "(no additional intake notes provided)"}

STRICT RULES:
- Use only the information given above. Never invent specific test scores, session counts, exact dates, or clinical findings that aren't supported by the notes.
- Do not name or reference specific clinical frameworks, assessment protocols, or published research/citations (e.g. named methodologies, "(Author, Year)" citations) unless one is explicitly mentioned in the notes above.
- Where a section has little or no relevant input, write a brief, honest, general sentence rather than fabricating detail — do not claim something is "within normal limits" or "age-appropriate" unless the notes actually support that.
- Write in a professional, warm clinical tone, third person, referring to the client by first name after the first mention.
- The "materials" list should be generic and based only on the evaluation mode given (e.g. "Parent/caregiver interview", "Clinical observation during the assessment session", "In-person evaluation" or "Teletherapy evaluation") — do not invent named test instruments.
- "goals" should be 2-4 general, reasonable therapy goals that follow naturally from the notes, phrased for a clinician to review and refine, not as finalized measurable objectives with invented numeric targets.
- Return ONLY valid JSON matching the required schema — no markdown, no commentary.`;
}

async function generateReport(assessment) {
  if (!isConfigured()) {
    const error = new Error("Report generation is not configured yet.");
    error.code = "NOT_CONFIGURED";
    throw error;
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(assessment) }] }],
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: "application/json",
        responseSchema: REPORT_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");

  if (!text) {
    throw new Error("Gemini returned an empty report.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Gemini returned a report that could not be parsed.");
  }
}

module.exports = { isConfigured, generateReport };
