import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import FormField from "../components/FormField";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Diverse Way Clinic</Text>
        <Text style={styles.subtitle}>Sign in to book appointments and see your history.</Text>
      </View>

      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Sign in" onPress={handleSubmit} loading={loading} style={{ marginTop: spacing.sm }} />

      <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.linkRow}>
        <Text style={styles.linkText}>
          Don't have an account? <Text style={styles.linkStrong}>Create one</Text>
        </Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.dark,
  },
  subtitle: {
    color: colors.muted,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: spacing.md,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  linkRow: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  linkText: {
    color: colors.muted,
  },
  linkStrong: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
});
