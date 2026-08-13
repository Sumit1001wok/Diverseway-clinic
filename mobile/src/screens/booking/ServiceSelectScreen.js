import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import Card from "../../components/Card";
import { getServices } from "../../api/clinic";
import { colors, spacing } from "../../theme";

export default function ServiceSelectScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getServices()
      .then((res) => setServices(res.data || []))
      .catch((err) => setError(err.message || "Could not load services."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScreenContainer>
      <Text style={styles.title}>Choose a therapy</Text>
      <Text style={styles.subtitle}>Select the service you'd like to book.</Text>

      {loading && <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {services.map((service) => (
        <TouchableOpacity
          key={service.id || service.slug}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("DateTime", { service: service.name })}
        >
          <Card>
            <Text style={styles.serviceName}>{service.name}</Text>
            {service.short_description ? (
              <Text style={styles.serviceDescription}>{service.short_description}</Text>
            ) : null}
          </Card>
        </TouchableOpacity>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.dark,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  error: {
    color: colors.danger,
  },
  serviceName: {
    fontWeight: "700",
    fontSize: 16,
    color: colors.dark,
  },
  serviceDescription: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 13,
  },
});
