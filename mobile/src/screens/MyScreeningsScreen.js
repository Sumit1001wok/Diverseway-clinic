import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Card from "../components/Card";
import { SCREENING_TIERS } from "../screeningData";
import { getMyScreenings } from "../api/auth";
import { colors, spacing, tierColors } from "../theme";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return d.toLocaleString();
}

export default function MyScreeningsScreen() {
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await getMyScreenings();
      setScreenings(res.data || []);
    } catch (err) {
      setError(err.message || "Could not load your screenings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load])
  );

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <Text style={styles.title}>My Screenings</Text>
      {loading && <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && screenings.length === 0 ? (
        <Text style={styles.empty}>No screenings yet.</Text>
      ) : null}

      {screenings.map((s) => {
        const tierInfo = SCREENING_TIERS[s.conclusion];
        const tc = tierColors[s.conclusion] || tierColors.ontrack;
        return (
          <Card key={s.id}>
            <Text style={styles.category}>{s.category_label || s.category}</Text>
            <Text style={styles.date}>{formatDate(s.created_at)}</Text>
            {tierInfo ? (
              <Text style={[styles.tier, { color: tc.fg }]}>
                {tierInfo.emoji} {tierInfo.label}
              </Text>
            ) : null}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { backgroundColor: colors.light, padding: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: "700", color: colors.dark, marginBottom: spacing.md },
  error: { color: colors.danger },
  empty: { color: colors.muted },
  category: { fontWeight: "700", color: colors.dark, fontSize: 15 },
  date: { color: colors.muted, fontSize: 12, marginTop: 2, marginBottom: spacing.sm },
  tier: { fontWeight: "700" },
});
