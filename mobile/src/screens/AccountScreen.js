import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();

  return (
    <ScreenContainer>
      <Text style={styles.title}>Account</Text>

      <Card>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.detail}>{user?.email}</Text>
        {user?.phone ? <Text style={styles.detail}>{user.phone}</Text> : null}
      </Card>

      <TouchableOpacity onPress={() => navigation.navigate("MyScreenings")}>
        <Card style={styles.row}>
          <Text style={styles.rowText}>My Screenings</Text>
          <Text style={styles.chevron}>›</Text>
        </Card>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => Linking.openURL("https://wa.me/9779845366417")}>
        <Card style={styles.row}>
          <Text style={styles.rowText}>Message us on WhatsApp</Text>
          <Text style={styles.chevron}>›</Text>
        </Card>
      </TouchableOpacity>

      <Button title="Sign out" variant="danger" onPress={signOut} style={{ marginTop: spacing.lg }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", color: colors.dark, marginBottom: spacing.md },
  name: { fontWeight: "700", fontSize: 17, color: colors.dark },
  detail: { color: colors.muted, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowText: { fontWeight: "600", color: colors.dark },
  chevron: { color: colors.muted, fontSize: 18 },
});
