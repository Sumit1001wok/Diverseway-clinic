import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import MyBookingsScreen from "../screens/MyBookingsScreen";
import ScreeningScreen from "../screens/ScreeningScreen";
import BookingStack from "./BookingStack";
import AccountStack from "./AccountStack";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();
const HomeStackNav = createNativeStackNavigator();
const BookingsStackNav = createNativeStackNavigator();
const ScreeningStackNav = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.white },
  headerTintColor: colors.dark,
  headerShadowVisible: false,
};

function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={screenOptions}>
      <HomeStackNav.Screen name="HomeMain" component={HomeScreen} options={{ title: "Diverse Way Clinic" }} />
    </HomeStackNav.Navigator>
  );
}

function BookingsStack() {
  return (
    <BookingsStackNav.Navigator screenOptions={screenOptions}>
      <BookingsStackNav.Screen name="MyBookingsMain" component={MyBookingsScreen} options={{ title: "My Bookings" }} />
    </BookingsStackNav.Navigator>
  );
}

function ScreeningStack() {
  return (
    <ScreeningStackNav.Navigator screenOptions={screenOptions}>
      <ScreeningStackNav.Screen name="ScreeningMain" component={ScreeningScreen} options={{ title: "Screening" }} />
    </ScreeningStackNav.Navigator>
  );
}

const TAB_ICONS = {
  HomeTab: "🏠",
  BookTab: "📅",
  BookingsTab: "🗂️",
  ScreeningTab: "🩺",
  AccountTab: "👤",
};

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: "Home" }} />
      <Tab.Screen name="BookTab" component={BookingStack} options={{ title: "Book" }} />
      <Tab.Screen name="BookingsTab" component={BookingsStack} options={{ title: "Bookings" }} />
      <Tab.Screen name="ScreeningTab" component={ScreeningStack} options={{ title: "Screening" }} />
      <Tab.Screen name="AccountTab" component={AccountStack} options={{ title: "Account" }} />
    </Tab.Navigator>
  );
}
