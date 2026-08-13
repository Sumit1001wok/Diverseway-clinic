"use strict";

// Field config for the clinic's paper "Speech Language Assessment" form —
// single source of truth for both the therapist dashboard's edit form and
// the print view, so they can't drift apart. Field ids double as the JSON
// keys stored in the assessments.data column (server/db.js).
const ASSESSMENT_SECTIONS = [
  {
    id: "header",
    title: null,
    fields: [
      { id: "client_name", label: "Name of client", type: "text", required: true },
      { id: "age_gender", label: "Age/Gender", type: "text" },
      { id: "address", label: "Address", type: "text" },
      { id: "informant", label: "Informant", type: "text" },
      { id: "location", label: "Location", type: "text" },
      { id: "assessment_date", label: "Date of Assessment", type: "date" },
      { id: "clinician", label: "Clinician", type: "text" },
      { id: "diagnosis", label: "Diagnosis", type: "text" },
    ],
  },
  {
    id: "complaint",
    title: "1. Complaint",
    fields: [{ id: "complaint", label: "Complaint", type: "textarea", hideLabel: true }],
  },
  {
    id: "medical_history",
    title: "2. Medical history",
    fields: [
      { id: "birth_history", label: "Birth history", type: "textarea" },
      { id: "motor_milestone", label: "Motor milestone", type: "textarea" },
      { id: "family_history", label: "Family history", type: "textarea" },
      { id: "medication", label: "Medication", type: "textarea" },
    ],
  },
  {
    id: "therapy_history",
    title: "3. Therapy history/School",
    fields: [
      { id: "therapy_history", label: "Therapy history/School", type: "textarea", hideLabel: true },
      { id: "iep", label: "IEP (if available)", type: "textarea" },
      { id: "environmental_modification", label: "Environmental Modification", type: "textarea" },
    ],
  },
  {
    id: "evaluation",
    title: "4. Evaluation",
    fields: [
      { id: "evaluation_mode", label: "In person / teletherapy", type: "text" },
      { id: "observation_in_session", label: "Observation in session", type: "textarea" },
    ],
  },
  {
    id: "oromotor",
    title: "5. Oromotor / Voice / Fluency / Articulation",
    fields: [
      { id: "oromotor", label: "Oromotor / Voice / Fluency / Articulation", type: "textarea", hideLabel: true },
    ],
  },
  {
    id: "receptive_language",
    title: "6. Receptive language",
    fields: [
      { id: "language_exposed", label: "Language exposed", type: "text" },
      { id: "content_listened", label: "Content listened / exposed", type: "textarea" },
      { id: "language_understanding", label: "Language understanding", type: "textarea" },
      { id: "follows_command", label: "Follows command (1st step/2nd step)", type: "text" },
      { id: "question_answer", label: "Question/Answer", type: "textarea" },
    ],
  },
  {
    id: "expressive_language",
    title: "7. Expressive language",
    fields: [
      { id: "mode_of_communication", label: "Mode of communication", type: "text" },
      { id: "communication_initiation", label: "Communication initiation", type: "text" },
      { id: "language_development_type", label: "Type of language Development", type: "text" },
      { id: "variety", label: "Variety", type: "text" },
      { id: "grammar", label: "Grammar", type: "text" },
      { id: "self_advocacy", label: "Self advocacy", type: "text" },
    ],
  },
  {
    id: "play",
    title: "8. Play",
    fields: [{ id: "play", label: "Play", type: "textarea", hideLabel: true }],
  },
  {
    id: "imitation_joint_attention",
    title: "9. Imitation and Joint attention",
    fields: [
      { id: "imitation_joint_attention", label: "Imitation and Joint attention", type: "textarea", hideLabel: true },
    ],
  },
  {
    id: "social_communication",
    title: "10. Social Communication",
    fields: [{ id: "social_communication", label: "Social Communication", type: "textarea", hideLabel: true }],
  },
  {
    id: "sensory_differences",
    title: "11. Sensory Differences",
    fields: [{ id: "sensory_differences", label: "Sensory Differences", type: "textarea", hideLabel: true }],
  },
  {
    id: "regulation",
    title: "12. Regulation",
    fields: [{ id: "regulation", label: "Regulation", type: "textarea", hideLabel: true }],
  },
  {
    id: "provisional_diagnosis",
    title: "13. Provisional Diagnosis",
    fields: [{ id: "provisional_diagnosis", label: "Provisional Diagnosis", type: "textarea", hideLabel: true }],
  },
  {
    id: "recommendation",
    title: "14. Recommendation",
    fields: [{ id: "recommendation", label: "Recommendation", type: "textarea", hideLabel: true }],
  },
];

window.ASSESSMENT_SECTIONS = ASSESSMENT_SECTIONS;
