import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { colors, radius, spacing } from "../theme";

export default function Button({ title, onPress, variant = "primary", loading, disabled, style }) {
  const isOutline = variant === "outline";
  const isDanger = variant === "danger";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        isOutline && styles.outline,
        isDanger && styles.danger,
        !isOutline && !isDanger && styles.primary,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.primaryDark : colors.white} />
      ) : (
        <Text style={[styles.text, isOutline && styles.outlineText, isDanger && styles.dangerText]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.dangerBg,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  outlineText: {
    color: colors.primaryDark,
  },
  dangerText: {
    color: colors.danger,
  },
});
