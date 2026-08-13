import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AccountScreen from "../screens/AccountScreen";
import MyScreeningsScreen from "../screens/MyScreeningsScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

export default function AccountStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.dark,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="AccountHome" component={AccountScreen} options={{ title: "Account" }} />
      <Stack.Screen name="MyScreenings" component={MyScreeningsScreen} options={{ title: "My Screenings" }} />
    </Stack.Navigator>
  );
}
