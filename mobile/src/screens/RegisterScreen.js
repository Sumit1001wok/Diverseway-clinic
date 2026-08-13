import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import FormField from "../components/FormField";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { colors, spacing } from "../theme";

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email, and password are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signUp({ name: name.trim(), email: email.trim(), phone: phone.trim(), password });
    } catch (err) {
      setError(err.message || "Could not create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Book appointments and keep track of your visits.</Text>
      </View>

      <FormField label="Full name" value={name} onChangeText={setName} autoComplete="name" />
      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <FormField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="98XXXXXXXX" />
      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="At least 8 characters"
        autoComplete="new-password"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Create account" onPress={handleSubmit} loading={loading} style={{ marginTop: spacing.sm }} />

      <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.linkRow}>
        <Text style={styles.linkText}>
          Already have an account? <Text style={styles.linkStrong}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.dark,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4,
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
