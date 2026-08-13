// Mirrors the :root color tokens in ../../css/style.css so the app matches
// the clinic's web brand instead of inventing a separate palette.
export const colors = {
  primary: "#70c5ce",
  primaryDark: "#4a9ea8",
  secondary: "#5abfb5",
  accent: "#f4a261",
  dark: "#1a1a2e",
  light: "#f5fbfc",
  white: "#ffffff",
  muted: "#6b7280",
  danger: "#b91c1c",
  dangerBg: "#fee2e2",
  border: "#e2e8f0",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const statusColors = {
  pending: { bg: "#fde8d3", fg: "#b45309" },
  confirmed: { bg: "#dcf2f0", fg: colors.primaryDark },
  completed: { bg: "#dbeafe", fg: "#1d4ed8" },
  cancelled: { bg: "#fee2e2", fg: "#b91c1c" },
  no_show: { bg: "#e5e7eb", fg: "#4b5563" },
};

export const tierColors = {
  ontrack: { bg: "#dcfce7", fg: "#15803d", emoji: "✅" },
  monitor: { bg: "#fef3c7", fg: "#b45309", emoji: "⚠️" },
  consult: { bg: "#ffedd5", fg: "#c2410c", emoji: "🟠" },
  refer: { bg: "#fee2e2", fg: "#b91c1c", emoji: "🔴" },
};
