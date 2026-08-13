import React from "react";
import { StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenContainer from "../../components/ScreenContainer";
import Button from "../../components/Button";
import { colors, spacing } from "../../theme";

export default function BookingResultScreen({ route }) {
  const { status, reference } = route.params;
  const navigation = useNavigation();
  const isSuccess = status === "success";

  return (
    <ScreenContainer style={styles.center}>
      <Text style={styles.emoji}>{isSuccess ? "✅" : "⚠️"}</Text>
      <Text style={styles.title}>{isSuccess ? "Booking confirmed" : "Payment didn't go through"}</Text>
      {isSuccess && reference ? <Text style={styles.reference}>Reference: {reference}</Text> : null}
      <Text style={styles.body}>
        {isSuccess
          ? "We've received your advance payment and your appointment is booked. You'll see it under My Bookings."
          : "Your booking wasn't confirmed because the payment wasn't completed. You can try again from My Bookings, or message us on WhatsApp."}
      </Text>
      <Button
        title="Go to My Bookings"
        onPress={() => navigation.navigate("BookingsTab")}
        style={{ marginTop: spacing.lg, alignSelf: "stretch" }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.dark,
    textAlign: "center",
  },
  reference: {
    color: colors.muted,
    marginTop: 4,
  },
  body: {
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 20,
  },
});
