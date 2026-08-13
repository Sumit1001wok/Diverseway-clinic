import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { colors } from "../../theme";
import { BASE_URL } from "../../api/client";

// eSewa's v2 checkout expects a real HTML <form method="post"> submit, not a
// fetch/XHR — same approach the web app's booking.html uses (see
// server/esewa.js buildPaymentForm). We render that exact form inside the
// WebView and auto-submit it on load, then intercept the redirect back to
// our own /api/payment/esewa/success|failure (which itself 302s to
// booking.html?payment=...) before the WebView ever loads that page, and
// hand off to a native result screen instead.
function buildFormHtml(payment) {
  const inputs = Object.entries(payment.fields)
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${String(value).replace(/"/g, "&quot;")}">`)
    .join("");

  return `
    <html>
      <body onload="document.forms[0].submit()">
        <form method="POST" action="${payment.formUrl}">${inputs}</form>
      </body>
    </html>
  `;
}

export default function CheckoutScreen({ route, navigation }) {
  const { payment, reference } = route.params;
  const html = useMemo(() => buildFormHtml(payment), [payment]);

  function handleShouldStartLoad(request) {
    const url = request.url || "";
    if (url.includes("/api/payment/esewa/success") || url.includes("/booking.html?payment=success")) {
      navigation.replace("BookingResult", { status: "success", reference });
      return false;
    }
    if (url.includes("/api/payment/esewa/failure") || url.includes("/booking.html?payment=failed")) {
      navigation.replace("BookingResult", { status: "failed", reference });
      return false;
    }
    return true;
  }

  return (
    <View style={styles.flex}>
      <WebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: BASE_URL }}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light,
  },
});
