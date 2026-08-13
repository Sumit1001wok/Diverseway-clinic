import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import { getMyBookings } from "../api/auth";
import { colors, spacing } from "../theme";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return d.toLocaleString();
}

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await getMyBookings();
      setBookings(res.data || []);
    } catch (err) {
      setError(err.message || "Could not load your bookings.");
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
    <ScreenContainer
      scroll={false}
      style={{ flex: 1, padding: 0 }}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <Text style={styles.title}>My Bookings</Text>

        {loading && <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && bookings.length === 0 ? (
          <Text style={styles.empty}>No bookings yet — book an appointment from the Home tab.</Text>
        ) : null}

        {bookings.map((b) => (
          <Card key={b.id}>
            <Text style={styles.service}>{b.service}</Text>
            <Text style={styles.meta}>
              {b.confirmed_date || b.preferred_date || "—"} {b.confirmed_time || b.preferred_time || ""}
            </Text>
            <Text style={styles.submitted}>Submitted {formatDate(b.created_at)}</Text>
            <StatusBadge status={b.status} />
          </Card>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.light,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.dark,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.danger,
  },
  empty: {
    color: colors.muted,
  },
  service: {
    fontWeight: "700",
    color: colors.dark,
    fontSize: 15,
  },
  meta: {
    color: colors.dark,
    marginTop: 2,
  },
  submitted: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
});
