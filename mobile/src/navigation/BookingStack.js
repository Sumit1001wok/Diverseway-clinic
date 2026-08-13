import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ServiceSelectScreen from "../screens/booking/ServiceSelectScreen";
import DateTimeScreen from "../screens/booking/DateTimeScreen";
import ConfirmScreen from "../screens/booking/ConfirmScreen";
import CheckoutScreen from "../screens/booking/CheckoutScreen";
import BookingResultScreen from "../screens/booking/BookingResultScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

export default function BookingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.dark,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="ServiceSelect" component={ServiceSelectScreen} options={{ title: "Book Appointment" }} />
      <Stack.Screen name="DateTime" component={DateTimeScreen} options={{ title: "Pick a Time" }} />
      <Stack.Screen name="Confirm" component={ConfirmScreen} options={{ title: "Confirm" }} />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: "Payment", gestureEnabled: false, headerBackVisible: false }}
      />
      <Stack.Screen
        name="BookingResult"
        component={BookingResultScreen}
        options={{ title: "Booking", headerBackVisible: false, gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
