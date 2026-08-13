import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import Button from "../../components/Button";
import { getAvailability } from "../../api/clinic";
import { nextDays } from "../../utils/dates";
import { colors, radius, spacing } from "../../theme";

export default function DateTimeScreen({ route, navigation }) {
  const { service } = route.params;
  const days = useMemo(() => nextDays(14), []);
  const [selectedDate, setSelectedDate] = useState(days[0].iso);
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedTime(null);
    setLoading(true);
    setError("");
    getAvailability(selectedDate, service)
      .then((res) => setSlots(res.data || []))
      .catch((err) => setError(err.message || "Could not load available times."))
      .finally(() => setLoading(false));
  }, [selectedDate, service]);

  function handleContinue() {
    if (!selectedTime) {
      return;
    }
    navigation.navigate("Confirm", { service, date: selectedDate, time: selectedTime });
  }

  return (
    <ScreenContainer scroll={false} style={{ flex: 1 }}>
      <Text style={styles.title}>{service}</Text>
      <Text style={styles.subtitle}>Pick a date and time.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayRow}>
        {days.map((d) => {
          const active = d.iso === selectedDate;
          return (
            <TouchableOpacity
              key={d.iso}
              onPress={() => setSelectedDate(d.iso)}
              style={[styles.dayChip, active && styles.dayChipActive]}
            >
              <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.timeArea}>
        {loading && <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && slots.length === 0 ? (
          <Text style={styles.empty}>No open times on this date — try another day.</Text>
        ) : null}
        <View style={styles.timeGrid}>
          {slots.map((slot) => {
            const active = slot.time === selectedTime;
            return (
              <TouchableOpacity
                key={slot.time}
                onPress={() => setSelectedTime(slot.time)}
                style={[styles.timeChip, active && styles.timeChipActive]}
              >
                <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>{slot.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Button title="Continue" onPress={handleContinue} disabled={!selectedTime} style={styles.continueBtn} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.dark,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  dayRow: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  dayChip: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    color: colors.dark,
    fontWeight: "600",
    fontSize: 13,
  },
  dayChipTextActive: {
    color: colors.white,
  },
  timeArea: {
    flex: 1,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  timeChip: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeChipText: {
    color: colors.dark,
    fontWeight: "600",
    fontSize: 13,
  },
  timeChipTextActive: {
    color: colors.white,
  },
  error: {
    color: colors.danger,
  },
  empty: {
    color: colors.muted,
    marginTop: spacing.md,
  },
  continueBtn: {
    marginTop: spacing.md,
  },
});
