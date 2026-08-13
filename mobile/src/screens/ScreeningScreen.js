import React, { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import Button from "../components/Button";
import FormField from "../components/FormField";
import { SCREENING_CATEGORIES, SCREENING_TIERS } from "../screeningData";
import { submitScreening, submitScreeningContact } from "../api/clinic";
import { colors, radius, spacing, tierColors } from "../theme";

const WHATSAPP_PHONE = "9779845366417";

const TIER_EXPLANATIONS = {
  ontrack: "Based on your answers, things look on track for now. Keep an eye on progress, and reach out anytime you have a concern.",
  monitor: "A few things are worth watching. We recommend rescreening in 4–6 weeks, or booking a consultation sooner if you're concerned.",
  consult: "Based on your answers, it's worth speaking with a speech-language pathologist to review this further.",
  refer: "Based on your answers, we recommend booking an assessment with a speech-language pathologist soon.",
};

const initialState = {
  step: "category", // category | ageBand | questions | notes | result
  category: null,
  ageBand: null,
  answers: {},
  questionIndex: 0,
  notes: "",
  tier: null,
  submissionId: null,
};

export default function ScreeningScreen() {
  const navigation = useNavigation();
  const [state, setState] = useState(initialState);

  function reset() {
    setState(initialState);
  }

  function pickCategory(category) {
    setState({
      ...initialState,
      category,
      step: category.ageBands ? "ageBand" : "questions",
    });
  }

  function pickAgeBand(ageBand) {
    setState((s) => ({ ...s, ageBand, step: "questions" }));
  }

  function currentQuestions() {
    return state.category.getQuestions(state.ageBand, state.answers);
  }

  function answerQuestion(questionId, value) {
    const nextAnswers = { ...state.answers, [questionId]: value };
    const questions = state.category.getQuestions(state.ageBand, nextAnswers);
    const nextIndex = state.questionIndex + 1;
    setState((s) => ({
      ...s,
      answers: nextAnswers,
      questionIndex: nextIndex,
      step: nextIndex >= questions.length ? "notes" : "questions",
    }));
  }

  function goBackQuestion() {
    setState((s) => {
      if (s.questionIndex === 0) {
        return { ...s, step: s.category.ageBands ? "ageBand" : "category" };
      }
      return { ...s, questionIndex: s.questionIndex - 1 };
    });
  }

  async function seeResults() {
    const tier = state.category.evaluate(state.answers, state.ageBand);
    setState((s) => ({ ...s, tier, step: "result" }));

    try {
      const res = await submitScreening({
        category: state.category.id,
        category_label: state.category.label,
        age_band: state.ageBand,
        answers: state.answers,
        notes: state.notes,
        conclusion: tier,
      });
      setState((s) => ({ ...s, submissionId: res.id }));
    } catch {
      // Non-fatal — the result is still shown locally either way.
    }
  }

  if (state.step === "category") {
    return (
      <ScreenContainer>
        <Text style={styles.title}>Free Speech & Language Screening</Text>
        <Text style={styles.subtitle}>Answer a few quick questions and get guidance on next steps.</Text>
        {SCREENING_CATEGORIES.map((c) => (
          <TouchableOpacity key={c.id} activeOpacity={0.85} onPress={() => pickCategory(c)}>
            <Card>
              <Text style={styles.categoryTitle}>{c.label}</Text>
              <Text style={styles.categoryDescription}>{c.description}</Text>
              <Text style={styles.categoryAudience}>{c.audience}</Text>
            </Card>
          </TouchableOpacity>
        ))}
      </ScreenContainer>
    );
  }

  if (state.step === "ageBand") {
    return (
      <ScreenContainer>
        <BackLink onPress={() => setState((s) => ({ ...s, step: "category" }))} />
        <Text style={styles.title}>{state.category.label}</Text>
        <Text style={styles.subtitle}>How old is your child?</Text>
        <View style={styles.chipGrid}>
          {state.category.ageBands.map((b) => (
            <TouchableOpacity key={b.id} onPress={() => pickAgeBand(b.id)} style={styles.ageChip}>
              <Text style={styles.ageChipText}>{b.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScreenContainer>
    );
  }

  if (state.step === "questions") {
    const questions = currentQuestions();
    const q = questions[state.questionIndex];
    return (
      <QuestionStep
        key={q.id}
        question={q}
        index={state.questionIndex}
        total={questions.length}
        currentValue={state.answers[q.id]}
        onAnswer={(value) => answerQuestion(q.id, value)}
        onBack={goBackQuestion}
      />
    );
  }

  if (state.step === "notes") {
    return (
      <ScreenContainer>
        <BackLink onPress={() => setState((s) => ({ ...s, step: "questions", questionIndex: currentQuestions().length - 1 }))} />
        <Text style={styles.title}>Almost done</Text>
        <Text style={styles.subtitle}>Anything else you'd like to tell us? (optional)</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          numberOfLines={4}
          value={state.notes}
          onChangeText={(notes) => setState((s) => ({ ...s, notes }))}
          placeholder="Optional context for our team..."
          placeholderTextColor={colors.muted}
        />
        <Button title="See my results" onPress={seeResults} />
      </ScreenContainer>
    );
  }

  // result
  const tierInfo = SCREENING_TIERS[state.tier];
  const tc = tierColors[state.tier];
  const waMessage = `Hi, I just completed the "${state.category.label}" screening on your app and got the result: ${tierInfo.label}. I'd like to know more.`;
  const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(waMessage)}`;

  return (
    <ScreenContainer>
      <View style={[styles.resultBadge, { backgroundColor: tc.bg }]}>
        <Text style={styles.resultEmoji}>{tierInfo.emoji}</Text>
        <Text style={[styles.resultLabel, { color: tc.fg }]}>{tierInfo.label}</Text>
      </View>
      <Text style={styles.resultExplain}>{TIER_EXPLANATIONS[state.tier]}</Text>

      <Button
        title="Book an appointment"
        onPress={() =>
          navigation.navigate("BookTab", {
            screen: "DateTime",
            params: { service: state.category.bookingService },
          })
        }
        style={{ marginTop: spacing.md }}
      />
      <Button title="Message us on WhatsApp" variant="outline" onPress={() => Linking.openURL(waUrl)} style={{ marginTop: spacing.sm }} />

      <ScreeningCallbackForm submissionId={state.submissionId} />

      <Text style={styles.disclaimer}>This is a screening aid, not a medical diagnosis. A licensed speech-language pathologist can give you a full assessment.</Text>

      <TouchableOpacity onPress={reset} style={styles.restartLink}>
        <Text style={styles.restartText}>Screen something else →</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

function BackLink({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.backLink}>
      <Text style={styles.backLinkText}>← Back</Text>
    </TouchableOpacity>
  );
}

function QuestionStep({ question, index, total, currentValue, onAnswer, onBack }) {
  const [selected, setSelected] = useState(Array.isArray(currentValue) ? currentValue : []);
  const isMulti = question.type === "multiselect";

  function toggleMulti(value) {
    let next;
    if (value === "no_concern") {
      next = selected.includes("no_concern") ? [] : ["no_concern"];
    } else {
      const withoutNone = selected.filter((v) => v !== "no_concern");
      next = withoutNone.includes(value) ? withoutNone.filter((v) => v !== value) : [...withoutNone, value];
    }
    setSelected(next);
  }

  return (
    <ScreenContainer>
      <BackLink onPress={onBack} />
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.round((index / total) * 100)}%` }]} />
      </View>
      <Text style={styles.progressLabel}>
        Question {Math.min(index + 1, total)} of {total}
      </Text>
      <Text style={styles.questionLabel}>{question.label}</Text>

      {isMulti ? (
        <>
          <Text style={styles.subtitle}>Select all that apply.</Text>
          <View style={styles.chipGrid}>
            {question.options.map((opt) => {
              const active = selected.includes(opt.value);
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => toggleMulti(opt.value)}
                  style={[styles.optionChip, active && styles.optionChipActive]}
                >
                  <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Button title="Continue" onPress={() => onAnswer(selected)} disabled={!selected.length} style={{ marginTop: spacing.md }} />
        </>
      ) : (
        <View style={styles.chipGrid}>
          {question.options.map((opt) => (
            <TouchableOpacity key={opt.value} onPress={() => onAnswer(opt.value)} style={styles.optionChip}>
              <Text style={styles.optionChipText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

function ScreeningCallbackForm({ submissionId }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !phone.trim() || !submissionId) {
      return;
    }
    setSending(true);
    try {
      await submitScreeningContact(submissionId, { contact_name: name.trim(), contact_phone: phone.trim() });
      setSent(true);
    } catch {
      // keep form visible so they can retry
    } finally {
      setSending(false);
    }
  }

  return (
    <Card style={{ marginTop: spacing.lg }}>
      <Text style={styles.callbackTitle}>Want us to call you back?</Text>
      {sent ? (
        <Text style={styles.callbackSuccess}>Thanks — we'll be in touch soon.</Text>
      ) : (
        <>
          <FormField label="Your name" value={name} onChangeText={setName} />
          <FormField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Button title="Request a callback" variant="outline" onPress={handleSubmit} loading={sending} />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", color: colors.dark },
  subtitle: { color: colors.muted, marginTop: 4, marginBottom: spacing.md },
  categoryTitle: { fontWeight: "700", fontSize: 15, color: colors.dark },
  categoryDescription: { color: colors.muted, marginTop: 4, fontSize: 13 },
  categoryAudience: { color: colors.primaryDark, marginTop: 6, fontSize: 12, fontWeight: "700" },
  backLink: { marginBottom: spacing.sm },
  backLinkText: { color: colors.primaryDark, fontWeight: "700" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  ageChip: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ageChipText: { color: colors.dark, fontWeight: "600" },
  optionChip: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.4,
    borderColor: colors.border,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionChipText: { color: colors.dark, fontWeight: "600" },
  optionChipTextActive: { color: colors.white },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  progressLabel: { color: colors.muted, fontSize: 12, marginBottom: spacing.md },
  questionLabel: { fontSize: 18, fontWeight: "700", color: colors.dark, marginBottom: spacing.md },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: "top",
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    color: colors.dark,
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  resultEmoji: { fontSize: 20 },
  resultLabel: { fontWeight: "700", fontSize: 15 },
  resultExplain: { color: colors.dark, lineHeight: 20 },
  callbackTitle: { fontWeight: "700", color: colors.dark, marginBottom: spacing.sm },
  callbackSuccess: { color: colors.primaryDark },
  disclaimer: { color: colors.muted, fontSize: 12, marginTop: spacing.lg, lineHeight: 16 },
  restartLink: { marginTop: spacing.md, alignItems: "center" },
  restartText: { color: colors.primaryDark, fontWeight: "700" },
});
