import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { statusColors } from "../theme";

const LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export default function StatusBadge({ status }) {
  const c = statusColors[status] || statusColors.pending;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{LABELS[status] || status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
});
