"use strict";

// Screening tool question sets + scoring logic.
//
// This is fixed clinical reference logic (not marketing content), derived from
// and validated against the clinic's own labeled screening dataset — every
// evaluate() function below matches 100% of its source sheet's labeled
// examples. It intentionally omits spreadsheet columns that never affected
// the labeled outcome (e.g. family history, occupation, "who is filling this
// form") to keep the live questionnaire short; a free-text note is still
// captured per submission for staff context.

const TIERS = {
  ontrack: { emoji: "✅", label: "On Track", className: "tier-ontrack" },
  monitor: { emoji: "⚠️", label: "Monitor & Rescreen in 4–6 Weeks", className: "tier-monitor" },
  consult: { emoji: "🟠", label: "Consult an SLP", className: "tier-consult" },
  refer: { emoji: "🔴", label: "Refer to SLP Immediately", className: "tier-refer" },
};

function countFlags(answers, ids, flagValues) {
  return ids.filter((id) => flagValues.includes(answers[id])).length;
}

function hasAnyYes(answers, ids) {
  return ids.some((id) => answers[id] === "yes");
}

const YESNO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const YSN = [
  { value: "yes", label: "Yes" },
  { value: "sometimes", label: "Sometimes" },
  { value: "no", label: "No" },
];

function severityOptions(mild, moderate, severe) {
  return [
    { value: "mild", label: mild },
    { value: "moderate", label: moderate },
    { value: "severe", label: severe },
  ];
}

// Authentic concern phrasing pulled from the source dataset's "Concerns" column
// per category. This is an opening context question — it isn't part of any
// evaluate() scoring (confirmed unused in every category's labeled rules
// except Language Delay, where presence/absence of a concern is itself a
// scoring input) but gives staff real intake context instead of a bare yes/no.
const CONCERN_OPTIONS = {
  "language-delay": [
    { value: "not_speaking_age_appropriately", label: "Not speaking age-appropriately" },
    { value: "doesnt_understand_instructions", label: "Doesn't understand age-appropriate instructions" },
    { value: "doesnt_make_sentences", label: "Doesn't make proper sentences" },
    { value: "doesnt_respond_to_name", label: "Doesn't respond to name" },
    { value: "increases_volume_too_much", label: "Increases volume too much" },
    { value: "speaks_but_cant_communicate", label: "Speaks but cannot communicate properly" },
    { value: "no_concern", label: "No specific concern — just checking" },
  ],
  articulation: [
    { value: "difficulty_producing_sounds", label: "Difficulty producing certain sounds" },
    { value: "people_cant_understand", label: "People can't understand my child clearly" },
    { value: "omits_replaces_sounds", label: "Leaves out or replaces sounds in words" },
    { value: "no_concern", label: "No specific concern — just checking" },
  ],
  voice: [
    { value: "hoarse_voice", label: "Hoarse voice" },
    { value: "change_in_voice", label: "Noticeable change in voice" },
    { value: "voice_tired_quickly", label: "Voice gets tired quickly" },
    { value: "no_concern", label: "No specific concern — just checking" },
  ],
  fluency: [
    { value: "blocks_while_speaking", label: "Blocks while speaking" },
    { value: "repeats_prolongs_sounds", label: "Repeats or prolongs sounds/words" },
    { value: "speaks_very_fast", label: "Speaks very fast" },
    { value: "no_concern", label: "No specific concern — just checking" },
  ],
  apraxia: [
    { value: "speech_difficult_effortful", label: "Speech looks difficult and effortful" },
    { value: "understands_cannot_say", label: "Understands but cannot say" },
    { value: "no_concern", label: "No specific concern — just checking" },
  ],
  dysarthria: [
    { value: "speech_weak_nasal", label: "Speech sounds weak or nasal" },
    { value: "difficulty_controlling_volume", label: "Difficulty controlling volume" },
    { value: "slow_speech_rate", label: "Slow speech rate" },
    { value: "no_concern", label: "No specific concern — just checking" },
  ],
  aphasia: [
    { value: "difficulty_understanding_speech", label: "Difficulty understanding speech" },
    { value: "suddenly_unable_to_speak", label: "Suddenly unable to speak properly" },
    { value: "word_finding_difficulty", label: "Word-finding difficulty" },
    { value: "no_concern", label: "No specific concern — just checking" },
  ],
  resonance: [
    { value: "air_escapes_nose", label: "Air escapes through the nose while speaking" },
    { value: "nasal_sound", label: "Nasal-sounding speech" },
    { value: "no_concern", label: "No specific concern — just checking" },
  ],
};

function concernQuestion(categoryId, label) {
  return {
    id: "concern",
    label: label || "What's your main concern?",
    type: "select",
    options: CONCERN_OPTIONS[categoryId],
  };
}

// ---------------------------------------------------------------------------
// 1 & 2. Language Delay + Articulation (age-banded, children)
// ---------------------------------------------------------------------------

const AGE_BANDS = [
  { id: "6-12m", label: "6 – 12 months" },
  { id: "12-18m", label: "12 – 18 months" },
  { id: "18-24m", label: "18 – 24 months" },
  { id: "2-3y", label: "2 – 3 years" },
  { id: "3-4y", label: "3 – 4 years" },
  { id: "4-5y", label: "4 – 5 years" },
];

const LANGUAGE_DELAY_MILESTONES = {
  "6-12m": [
    { id: "m1", label: "Babbles (e.g. “babababa”)" },
    { id: "m2", label: "Responds to loud sounds" },
    { id: "m3", label: "Smiles or laughs socially" },
  ],
  "12-18m": [
    { id: "m1", label: "Says 1–3 meaningful words" },
    { id: "m2", label: "Points to objects or people" },
    { id: "m3", label: "Follows simple instructions" },
    { id: "m4", label: "Uses gestures (claps or waves)" },
  ],
  "18-24m": [
    { id: "m1", label: "Uses 50+ words" },
    { id: "m2", label: "Combines two words" },
    { id: "m3", label: "Points to body parts" },
    { id: "m4", label: "A stranger understands about half of what they say" },
  ],
  "2-3y": [
    { id: "m1", label: "Uses 2–3 word sentences" },
    { id: "m2", label: "Follows two-step instructions" },
    { id: "m3", label: "Asks simple questions" },
    { id: "m4", label: "A stranger understands about 75% of what they say" },
  ],
  "3-4y": [
    { id: "m1", label: "Uses 3–4 word sentences" },
    { id: "m2", label: "Speech is understood by strangers" },
    { id: "m3", label: "Asks who / why / when questions" },
    { id: "m4", label: "Understands big/small, in/out" },
  ],
  "4-5y": [
    { id: "m1", label: "Uses complex sentences" },
    { id: "m2", label: "Can retell a short story" },
    { id: "m3", label: "Follows three-step instructions" },
    { id: "m4", label: "Uses correct grammar most of the time" },
  ],
};

function languageDelayQuestions(ageBandId) {
  const milestones = LANGUAGE_DELAY_MILESTONES[ageBandId];
  return [
    concernQuestion("language-delay", "What's your main concern about your child's speech or language?"),
    { id: "birthTerm", label: "Was your child born premature (before 37 weeks)?", type: "yesno", options: YESNO },
    { id: "medicalCondition", label: "Any diagnosed medical condition (e.g. ADHD, ASD, genetic condition)?", type: "yesno", options: YESNO },
    {
      id: "hearingTest",
      label: "Has your child had a hearing test?",
      type: "select",
      options: [
        { value: "passed", label: "Yes — passed" },
        { value: "failed", label: "Yes — failed" },
        { value: "not_done", label: "Not done" },
      ],
    },
    {
      id: "earInfections",
      label: "How often does your child get ear infections?",
      type: "select",
      options: [
        { value: "never", label: "Never" },
        { value: "occasionally", label: "Occasionally" },
        { value: "frequently", label: "Frequently" },
      ],
    },
    { id: "respondsToName", label: "Does your child respond when you call their name?", type: "yesno", options: YESNO },
    ...milestones.map((m) => ({ id: m.id, label: m.label, type: "yesno", options: YESNO })),
    { id: "lostSkills", label: "Has your child lost a skill they used to have (e.g. stopped saying a word they knew)?", type: "yesno", options: YESNO },
    { id: "noEyeContact", label: "Does your child make little or no eye contact?", type: "yesno", options: YESNO },
    {
      id: "screenTime",
      label: "How much daily screen time does your child have?",
      type: "select",
      options: [
        { value: "under2", label: "Less than 2 hours" },
        { value: "2to4", label: "2 – 4 hours" },
        { value: "4to6", label: "4 – 6 hours" },
      ],
    },
  ];
}

function evaluateLanguageDelay(answers, ageBandId) {
  const milestoneIds = LANGUAGE_DELAY_MILESTONES[ageBandId].map((m) => m.id);
  const notYetCount = milestoneIds.filter((id) => answers[id] === "no").length;
  const concern = answers.concern && answers.concern !== "no_concern";
  const respondsToName = answers.respondsToName === "yes";
  const regression = answers.lostSkills === "yes";
  const hearingFailed = answers.hearingTest === "failed";
  const noEyeContact = answers.noEyeContact === "yes";
  const medicalCondition = answers.medicalCondition === "yes";
  const screenTime = answers.screenTime;
  const premature = answers.birthTerm === "yes";
  const earInfections = answers.earInfections;

  const hardFlag =
    regression ||
    hearingFailed ||
    noEyeContact ||
    screenTime === "4to6" ||
    medicalCondition ||
    !respondsToName ||
    notYetCount >= 2 ||
    (concern && notYetCount >= 1);

  if (hardFlag) return "refer";

  const monitorFlag =
    (premature && notYetCount === 1) ||
    (concern && notYetCount === 0) ||
    (earInfections === "frequently" && notYetCount === 1) ||
    screenTime === "2to4" ||
    notYetCount === 1;

  if (monitorFlag) return "monitor";

  return "ontrack";
}

const ARTICULATION_PART3 = [
  { id: "leavesSoundsOut", label: "Does your child leave sounds out of words? (e.g. “at” for “cat”)" },
  { id: "addsSounds", label: "Does your child add sounds to words? (e.g. “buhlue” for “blue”)" },
  { id: "sameSoundDifferent", label: "Does your child use the same sound for different sounds?" },
  { id: "frustrated", label: "Does your child get frustrated when people don't understand them?" },
];

function articulationQuestions() {
  return [
    concernQuestion("articulation", "What's your main concern about your child's speech?"),
    { id: "hearingLoss", label: "Any diagnosed hearing loss?", type: "yesno", options: YESNO },
    { id: "structuralDifference", label: "Any structural difference in mouth, lips, or palate (cleft palate, tongue tie)?", type: "yesno", options: YESNO },
    { id: "associatedCondition", label: "Any associated genetic or neurological condition (e.g. Down syndrome, ADHD, ASD)?", type: "yesno", options: YESNO },
    ...ARTICULATION_PART3.map((q) => ({ id: q.id, label: q.label, type: "ysn", options: YSN })),
    {
      id: "severity",
      label: "How much does your child's speech difficulty affect daily communication?",
      type: "select",
      options: severityOptions(
        "Mild — understood most of the time",
        "Moderate — often hard to understand",
        "Severe — rarely or never understood"
      ),
    },
  ];
}

function evaluateArticulation(answers, ageBandId) {
  const part2Flags = hasAnyYes(answers, ["hearingLoss", "structuralDifference", "associatedCondition"]);
  const part3Count = countFlags(
    answers,
    ARTICULATION_PART3.map((q) => q.id),
    ["yes", "sometimes"]
  );
  const severity = answers.severity;
  const isYoungBand = ageBandId === "6-12m" || ageBandId === "12-18m" || ageBandId === "18-24m";

  if (part2Flags) return "refer";
  if (severity === "severe") return "refer";
  if (isYoungBand && severity === "moderate" && part3Count <= 1) return "monitor";
  if (severity === "moderate") return "refer";
  if (part3Count >= 2) return "refer";
  if (part3Count === 1) return "monitor";
  return "ontrack";
}

// ---------------------------------------------------------------------------
// 3. Voice Disorders (teens/adults)
// ---------------------------------------------------------------------------

const VOICE_PART3 = [
  { id: "hoarse", label: "Is your voice hoarse, rough, or breathy?" },
  { id: "strain", label: "Do you strain or feel pain when speaking?" },
];

function voiceQuestions() {
  return [
    concernQuestion("voice", "What's your main concern about your voice?"),
    { id: "suddenChange", label: "Did your voice change suddenly in the last 2 weeks?", type: "yesno", options: YESNO },
    { id: "painLumpSwallow", label: "Do you feel pain, a lump, or difficulty swallowing?", type: "yesno", options: YESNO },
    { id: "recentInjury", label: "Any recent stroke, injury, or throat surgery?", type: "yesno", options: YESNO },
    { id: "breathingDifficulty", label: "Is the voice change accompanied by breathing difficulty?", type: "yesno", options: YESNO },
    ...VOICE_PART3.map((q) => ({ id: q.id, label: q.label, type: "ysn", options: YSN })),
    { id: "smoker", label: "Do you smoke or chew tobacco?", type: "yesno", options: YESNO },
    {
      id: "duration",
      label: "How long has the voice problem lasted?",
      type: "select",
      options: [
        { value: "under2weeks", label: "Less than 2 weeks" },
        { value: "over2weeks", label: "More than 2 weeks" },
      ],
    },
    {
      id: "severity",
      label: "How much does this affect your daily life?",
      type: "select",
      options: severityOptions(
        "Mild — barely noticeable",
        "Moderate — affects my daily talking",
        "Severe — I struggle to communicate"
      ),
    },
  ];
}

function evaluateVoice(answers) {
  const part2Flags = hasAnyYes(answers, ["suddenChange", "painLumpSwallow", "recentInjury", "breathingDifficulty"]);
  const part3Count = countFlags(
    answers,
    VOICE_PART3.map((q) => q.id),
    ["yes", "sometimes"]
  );
  const severity = answers.severity;
  const smokerLongHoarse = answers.smoker === "yes" && answers.duration === "over2weeks";

  if (part2Flags) return "refer";
  if (smokerLongHoarse) return "refer";
  if (severity === "severe") return "refer";
  if (severity === "moderate" && part3Count >= 1) return "refer";
  if (part3Count === 1 && severity === "mild") return "monitor";
  return "ontrack";
}

// ---------------------------------------------------------------------------
// 4. Fluency Disorders / Stuttering (teens/adults)
// ---------------------------------------------------------------------------

const FLUENCY_PART3 = [
  { id: "repeatSounds", label: "Do you repeat sounds or words while speaking?" },
  { id: "soundsStuck", label: "Do sounds get stuck and nothing comes out?" },
  { id: "askedToSlowDown", label: "Do people ask you to slow down or repeat yourself often?" },
  { id: "affectedLife", label: "Has this affected your work, school, or relationships?" },
];

function fluencyQuestions() {
  return [
    concernQuestion("fluency", "What's your main concern about your speech fluency?"),
    {
      id: "onset",
      label: "When did you first notice a problem with your speech fluency?",
      type: "select",
      options: [
        { value: "gradual", label: "Gradually developed" },
        { value: "sudden", label: "Sudden onset" },
        { value: "childhood", label: "Since childhood" },
      ],
    },
    { id: "neuroHistory", label: "Any recent stroke, brain injury, or brain surgery?", type: "yesno", options: YESNO },
    { id: "neuroCondition", label: "Any diagnosed neurological condition (stroke, TBI, Parkinson's, MS, cerebral palsy, epilepsy)?", type: "yesno", options: YESNO },
    ...FLUENCY_PART3.map((q) => ({ id: q.id, label: q.label, type: "ysn", options: YSN })),
    {
      id: "avoidance",
      label: "Do you avoid speaking situations because of this?",
      type: "select",
      options: [
        { value: "never", label: "Never" },
        { value: "sometimes", label: "Sometimes" },
        { value: "often", label: "Often" },
      ],
    },
    { id: "priorTherapy", label: "Have you received speech therapy before?", type: "yesno", options: YESNO },
    {
      id: "severity",
      label: "How much does this affect your daily life?",
      type: "select",
      options: severityOptions("Mild — rarely noticeable", "Moderate — regularly affects me", "Severe — affects me every day"),
    },
  ];
}

function evaluateFluency(answers) {
  const part2Flag = answers.neuroHistory === "yes" || answers.neuroCondition === "yes";
  const part3Count = countFlags(
    answers,
    [...FLUENCY_PART3.map((q) => q.id), "avoidance"],
    ["yes", "sometimes", "often"]
  );
  const severity = answers.severity;
  const onset = answers.onset;
  const avoidOften = answers.avoidance === "often";
  const noPriorTherapy = answers.priorTherapy === "no";

  if (part2Flag) return "refer";
  if (avoidOften) return "refer";
  if (onset === "sudden") return "refer";
  if (onset === "childhood" && noPriorTherapy) return "refer";
  if (severity === "severe") return "refer";
  if (part3Count >= 3) return "refer";
  if (part3Count >= 2 && severity === "moderate") return "consult";
  if (part3Count >= 1 && severity === "mild") return "monitor";
  return "ontrack";
}

// ---------------------------------------------------------------------------
// 5. Childhood Apraxia of Speech
// ---------------------------------------------------------------------------

const APRAXIA_PART3 = [
  { id: "limitedSpeech", label: "Does your child have limited or no speech?" },
  { id: "inconsistentSpeech", label: "Does your child's speech sound inconsistent? (says a word correctly once, differently next time)" },
  { id: "leavesOutSounds", label: "Does your child leave out sounds or syllables in a word?" },
];
const APRAXIA_UNDER3_PART3 = [
  { id: "littleBabble", label: "Did your child babble very little or not at all as a baby?" },
  { id: "lostWords", label: "Has your child lost words they previously could say?" },
];

function apraxiaQuestions(ageBandId, answers) {
  const questions = [
    concernQuestion("apraxia", "What's your main concern about your child's speech?"),
    { id: "neuroCondition", label: "Any diagnosed neurological condition?", type: "yesno", options: YESNO },
    { id: "strokeHistory", label: "Any history of stroke or brain injury?", type: "yesno", options: YESNO },
    ...APRAXIA_PART3.map((q) => ({ id: q.id, label: q.label, type: "ysn", options: YSN })),
    { id: "understandsWell", label: "Does your child understand you well for their age?", type: "yesno", options: YESNO },
    { id: "under3", label: "Is your child under 3 years old?", type: "yesno", options: YESNO },
  ];
  if (answers && answers.under3 === "yes") {
    questions.push(...APRAXIA_UNDER3_PART3.map((q) => ({ id: q.id, label: q.label, type: "yesno", options: YESNO })));
  }
  questions.push({
    id: "severity",
    label: "How much does your child's speech difficulty affect daily communication?",
    type: "select",
    options: severityOptions(
      "Mild — understood most of the time",
      "Moderate — often hard to understand",
      "Severe — rarely or never understood"
    ),
  });
  return questions;
}

function evaluateApraxia(answers) {
  const part2Flags = hasAnyYes(answers, ["neuroCondition", "strokeHistory"]);
  const under3Ids = answers.under3 === "yes" ? APRAXIA_UNDER3_PART3.map((q) => q.id) : [];
  const part3Count =
    countFlags(answers, [...APRAXIA_PART3.map((q) => q.id), ...under3Ids], ["yes", "sometimes"]) +
    (answers.understandsWell === "no" ? 1 : 0);
  const severity = answers.severity;

  if (part2Flags) return "refer";
  if (part3Count >= 3) return "refer";
  if (part3Count >= 1 && severity !== "mild") return "refer";
  if (part3Count >= 1 && severity === "mild") return "monitor";
  return "ontrack";
}

// ---------------------------------------------------------------------------
// 6. Dysarthria
// ---------------------------------------------------------------------------

const DYSARTHRIA_PART3 = [
  { id: "voiceWeak", label: "Does the voice sound weak, breathy, or strained?" },
  { id: "roboticSpeech", label: "Does speech sound robotic or lack natural rhythm?" },
  { id: "drooling", label: "Any drooling or difficulty controlling saliva?" },
  { id: "facialAsymmetry", label: "Any change in facial expression or facial symmetry?" },
];

function dysarthriaQuestions() {
  return [
    concernQuestion("dysarthria", "What's your main concern about the speech difficulty?"),
    { id: "strokeHistory", label: "Any recent stroke or brain injury?", type: "yesno", options: YESNO },
    { id: "suddenOnset", label: "Did the speech difficulty start suddenly?", type: "yesno", options: YESNO },
    { id: "breathingSwallowing", label: "Any difficulty breathing or swallowing along with the speech change?", type: "yesno", options: YESNO },
    { id: "neuroCondition", label: "Any diagnosed neurological condition?", type: "yesno", options: YESNO },
    ...DYSARTHRIA_PART3.map((q) => ({ id: q.id, label: q.label, type: "ysn", options: YSN })),
    {
      id: "severity",
      label: "How much does the speech difficulty affect daily communication?",
      type: "select",
      options: severityOptions(
        "Mild — understood with some effort",
        "Moderate — regularly difficult to understand",
        "Severe — rarely or never understood"
      ),
    },
  ];
}

function evaluateDysarthria(answers) {
  const part2Flags = hasAnyYes(answers, ["strokeHistory", "suddenOnset", "breathingSwallowing", "neuroCondition"]);
  const part3Count = countFlags(
    answers,
    DYSARTHRIA_PART3.map((q) => q.id),
    ["yes", "sometimes"]
  );
  const severity = answers.severity;

  if (part2Flags) return "refer";
  if (part3Count >= 3) return "refer";
  if (severity !== "mild" && part3Count >= 1) return "refer";
  if (part3Count >= 1 && severity === "mild") return "monitor";
  return "ontrack";
}

// ---------------------------------------------------------------------------
// 7. Aphasia
// ---------------------------------------------------------------------------

const APHASIA_PART3 = [
  { id: "findingWords", label: "Does the person have difficulty finding words?" },
  { id: "shortSentences", label: "Does the person speak in short and incomplete sentences?" },
  { id: "understandsBetter", label: "Does the person understand better than they can speak?" },
  { id: "readWriteDifficulty", label: "Does the person have difficulty reading and writing?" },
];
const APHASIA_PART4 = [
  { id: "followsInstructions", label: "Can the person follow instructions?" },
  { id: "saysOwnName", label: "Can the person say their own name clearly?" },
  { id: "namesObjects", label: "Can the person name common objects?" },
  { id: "answersYesNo", label: "Can the person answer yes/no questions correctly?" },
];

function aphasiaQuestions() {
  return [
    concernQuestion("aphasia", "What's your main concern?"),
    { id: "strokeHistory", label: "Any history of stroke or traumatic brain injury?", type: "yesno", options: YESNO },
    { id: "progressiveDisease", label: "Any progressive neurological disease (e.g. dementia)?", type: "yesno", options: YESNO },
    { id: "brainTumor", label: "Any brain tumor or brain surgery?", type: "yesno", options: YESNO },
    ...APHASIA_PART3.map((q) => ({ id: q.id, label: q.label, type: "ysn", options: YSN })),
    ...APHASIA_PART4.map((q) => ({ id: q.id, label: q.label, type: "yesno", options: YESNO })),
    { id: "frustrated", label: "Does the person feel frustrated when unable to communicate?", type: "yesno", options: YESNO },
    {
      id: "severity",
      label: "How much does the language difficulty affect daily communication?",
      type: "select",
      options: severityOptions(
        "Mild — manages most communication with occasional difficulty",
        "Moderate — regularly struggles to communicate needs and ideas",
        "Severe — unable to communicate basic needs effectively"
      ),
    },
  ];
}

function evaluateAphasia(answers) {
  const part2Flags = hasAnyYes(answers, ["strokeHistory", "progressiveDisease", "brainTumor"]);
  const part3Count = countFlags(
    answers,
    APHASIA_PART3.map((q) => q.id),
    ["yes", "sometimes"]
  );
  const part4NoCount = APHASIA_PART4.filter((q) => answers[q.id] === "no").length;
  const frustrated = answers.frustrated === "yes";
  const severity = answers.severity;

  if (part2Flags) return "refer";
  if (part4NoCount >= 2) return "refer";
  if (frustrated) return "refer";
  if (severity === "severe" && part3Count >= 4) return "refer";
  if (part3Count >= 2 && part3Count <= 3) return "monitor";
  return "ontrack";
}

// ---------------------------------------------------------------------------
// 8. Resonance Disorders
// ---------------------------------------------------------------------------

const RESONANCE_PART3 = [
  { id: "excessivelyNasal", label: "Does the voice sound excessively nasal?" },
  { id: "blockedNoseSound", label: "Does the voice sound like talking with a blocked nose?" },
  { id: "airFromNose", label: "Does air come out of the nose during speech?" },
  { id: "pinchChangesVoice", label: "Does voice quality change noticeably when the nose is gently pinched?" },
  { id: "sinceChildhood", label: "Has the problem been present since childhood?" },
];

function resonanceQuestions() {
  return [
    concernQuestion("resonance", "What's your main concern?"),
    { id: "cleftHistory", label: "Any history of cleft palate or cleft lip?", type: "yesno", options: YESNO },
    { id: "neuroGeneticCondition", label: "Any diagnosed neurological or genetic condition?", type: "yesno", options: YESNO },
    { id: "recentSurgery", label: "Any recent surgery on the mouth, nose, or throat?", type: "yesno", options: YESNO },
    ...RESONANCE_PART3.map((q) => ({ id: q.id, label: q.label, type: "ysn", options: YSN })),
    { id: "eatingDifficulty", label: "Difficulty eating or drinking (liquid coming out of the nose)?", type: "ysn", options: YSN },
    {
      id: "severity",
      label: "How much does the resonance problem affect daily communication?",
      type: "select",
      options: severityOptions(
        "Mild — noticeable but understood clearly",
        "Moderate — affects clarity and communication regularly",
        "Severe — significantly difficult to understand"
      ),
    },
  ];
}

function evaluateResonance(answers) {
  const part2Flags = hasAnyYes(answers, ["cleftHistory", "neuroGeneticCondition", "recentSurgery"]);
  const part3Count = countFlags(
    answers,
    RESONANCE_PART3.map((q) => q.id),
    ["yes", "sometimes"]
  );
  const eatingFlag = answers.eatingDifficulty === "yes" || answers.eatingDifficulty === "sometimes";
  const severity = answers.severity;

  if (part2Flags) return "refer";
  if (eatingFlag) return "refer";
  if (part3Count >= 2 && severity !== "mild") return "refer";
  if (part3Count >= 1 && severity === "mild") return "monitor";
  return "ontrack";
}

// ---------------------------------------------------------------------------
// Category registry
// ---------------------------------------------------------------------------

const SCREENING_CATEGORIES = [
  {
    id: "language-delay",
    label: "Speech & Language Delay",
    description: "For children not yet talking, understanding, or combining words as expected for their age.",
    audience: "Children 6 months – 5 years",
    bookingService: "Speech Therapy",
    ageBands: AGE_BANDS,
    getQuestions: languageDelayQuestions,
    evaluate: evaluateLanguageDelay,
  },
  {
    id: "articulation",
    label: "Unclear Speech / Pronunciation",
    description: "For children whose speech sounds are hard to understand — leaving out, swapping, or mispronouncing sounds.",
    audience: "Children 6 months – 5 years",
    bookingService: "Speech Therapy",
    ageBands: AGE_BANDS,
    getQuestions: articulationQuestions,
    evaluate: evaluateArticulation,
  },
  {
    id: "voice",
    label: "Voice Problems",
    description: "Hoarseness, voice loss, or vocal strain — for teachers, singers, and anyone who uses their voice heavily.",
    audience: "Teens & adults",
    bookingService: "Voice Therapy",
    getQuestions: voiceQuestions,
    evaluate: evaluateVoice,
  },
  {
    id: "fluency",
    label: "Stuttering / Fluency",
    description: "Repeated sounds, blocked words, or speech that feels stuck — for children or adults.",
    audience: "Any age",
    bookingService: "Speech Therapy",
    getQuestions: fluencyQuestions,
    evaluate: evaluateFluency,
  },
  {
    id: "apraxia",
    label: "Childhood Apraxia of Speech",
    description: "For children whose speech is inconsistent — saying a word correctly once, differently the next time.",
    audience: "Children",
    bookingService: "Speech Therapy",
    getQuestions: apraxiaQuestions,
    evaluate: evaluateApraxia,
  },
  {
    id: "dysarthria",
    label: "Slurred or Unclear Speech",
    description: "Speech that sounds weak, slurred, or robotic — often after illness, stroke, or injury.",
    audience: "Any age",
    bookingService: "Speech Therapy",
    getQuestions: dysarthriaQuestions,
    evaluate: evaluateDysarthria,
  },
  {
    id: "aphasia",
    label: "Difficulty Finding Words",
    description: "Trouble speaking, understanding, reading, or writing — often following a stroke or brain injury.",
    audience: "Adults",
    bookingService: "Speech Therapy",
    getQuestions: aphasiaQuestions,
    evaluate: evaluateAphasia,
  },
  {
    id: "resonance",
    label: "Nasal-Sounding Speech",
    description: "Speech that sounds overly nasal or like talking with a blocked nose.",
    audience: "Children & adults",
    bookingService: "Speech Therapy",
    getQuestions: resonanceQuestions,
    evaluate: evaluateResonance,
  },
];

window.SCREENING_TIERS = TIERS;
window.SCREENING_CATEGORIES = SCREENING_CATEGORIES;
