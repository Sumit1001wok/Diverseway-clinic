import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing } from "../theme";

const ACTIONS = [
  {
    key: "book",
    title: "Book an appointment",
    description: "Choose a therapy and a time that works for you.",
    tab: "BookTab",
    emoji: "📅",
  },
  {
    key: "screening",
    title: "Free speech & language screening",
    description: "A quick 2-minute check across 8 common concerns.",
    tab: "ScreeningTab",
    emoji: "🩺",
  },
  {
    key: "bookings",
    title: "My bookings",
    description: "See your upcoming and past appointments.",
    tab: "BookingsTab",
    emoji: "🗂️",
  },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  return (
    <ScreenContainer>
      <Text style={styles.greeting}>Namaste{user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋</Text>
      <Text style={styles.subtitle}>What would you like to do today?</Text>

      {ACTIONS.map((action) => (
        <TouchableOpacity key={action.key} activeOpacity={0.85} onPress={() => navigation.navigate(action.tab)}>
          <Card style={styles.actionCard}>
            <View style={styles.emojiWrap}>
              <Text style={styles.emoji}>{action.emoji}</Text>
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDescription}>{action.description}</Text>
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      <Card style={styles.contactCard}>
        <Text style={styles.contactTitle}>Need to talk to us directly?</Text>
        <Text style={styles.contactText}>WhatsApp/phone: 9845366417 or 9841362404</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.dark,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.light,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  emoji: {
    fontSize: 22,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontWeight: "700",
    color: colors.dark,
    fontSize: 15,
  },
  actionDescription: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 13,
  },
  contactCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
  },
  contactTitle: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  contactText: {
    color: colors.white,
    marginTop: 4,
    opacity: 0.9,
  },
});
