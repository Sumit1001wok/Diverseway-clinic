import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import FormField from "../../components/FormField";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { createBooking } from "../../api/clinic";
import { useAuth } from "../../context/AuthContext";
import { colors, radius, spacing } from "../../theme";

const VISIT_TYPES = [
  { value: "new", label: "New patient" },
  { value: "follow_up", label: "Follow-up" },
];

export default function ConfirmScreen({ route, navigation }) {
  const { service, date, time } = route.params;
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [visitType, setVisitType] = useState("new");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) {
      setError("Your name and phone number are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await createBooking({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        patient_name: patientName.trim() || undefined,
        patient_age: patientAge.trim() || undefined,
        visit_type: visitType,
        service,
        preferred_date: date,
        preferred_time: time,
        message: message.trim() || undefined,
      });
      navigation.navigate("Checkout", { payment: res.payment, reference: res.reference });
    } catch (err) {
      setError(err.message || "Could not create the booking.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Confirm your details</Text>

      <Card style={styles.summary}>
        <Text style={styles.summaryLine}>{service}</Text>
        <Text style={styles.summarySub}>
          {date} at {time}
        </Text>
      </Card>

      <FormField label="Your name" value={name} onChangeText={setName} autoComplete="name" />
      <FormField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <FormField
        label="Email (optional)"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <FormField
        label="Patient name (if different from you)"
        value={patientName}
        onChangeText={setPatientName}
      />
      <FormField label="Patient age" value={patientAge} onChangeText={setPatientAge} keyboardType="numeric" />

      <Text style={styles.label}>Visit type</Text>
      <View style={styles.visitRow}>
        {VISIT_TYPES.map((v) => {
          const active = v.value === visitType;
          return (
            <TouchableOpacity
              key={v.value}
              onPress={() => setVisitType(v.value)}
              style={[styles.visitChip, active && styles.visitChipActive]}
            >
              <Text style={[styles.visitChipText, active && styles.visitChipTextActive]}>{v.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FormField
        label="Anything else we should know? (optional)"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={3}
        style={{ marginTop: spacing.md }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Continue to payment" onPress={handleSubmit} loading={loading} style={{ marginTop: spacing.sm }} />
      <Text style={styles.note}>A small advance payment via eSewa confirms your booking.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.dark,
    marginBottom: spacing.md,
  },
  summary: {
    backgroundColor: colors.light,
  },
  summaryLine: {
    fontWeight: "700",
    color: colors.dark,
  },
  summarySub: {
    color: colors.muted,
    marginTop: 2,
  },
  label: {
    fontWeight: "700",
    color: colors.dark,
    marginBottom: 6,
    fontSize: 14,
  },
  visitRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  visitChip: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  visitChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  visitChipText: {
    color: colors.dark,
    fontWeight: "600",
  },
  visitChipTextActive: {
    color: colors.white,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  note: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
