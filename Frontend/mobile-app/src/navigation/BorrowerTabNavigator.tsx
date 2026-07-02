/** @format */

import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FindLoansScreen from "../screens/borrower/FindLoansScreen";
import Home from "../screens/borrower/Home";
import PaymentsScreen from "../screens/borrower/PaymentsScreen";
import SupportScreen from "../screens/borrower/SupportScreen";
import ProfileScreen from "../screens/borrower/ProfileScreen";
import AgreementsListScreen from "../screens/shared/AgreementsListScreen";

const Tab = createBottomTabNavigator();
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<
  "Home" | "Loans" | "Payments" | "Support" | "Agreement" | "Profile",
  { active: IoniconName; inactive: IoniconName }
> = {
  Home: {
    active: "home",
    inactive: "home-outline",
  },
  Loans: {
    active: "wallet",
    inactive: "wallet-outline",
  },
  Payments: {
    active: "card",
    inactive: "card-outline",
  },
  Support: {
    active: "chatbubble-ellipses",
    inactive: "chatbubble-ellipses-outline",
  },
  Agreement: {
    active: "document-text",
    inactive: "document-text-outline",
  },
  Profile: {
    active: "person-circle",
    inactive: "person-circle-outline",
  },
};

function BorrowerTabIcon({
  route,
  focused,
  color,
  size,
}: {
  route: keyof typeof TAB_ICONS;
  focused: boolean;
  color: string;
  size: number;
}) {
  const icon = TAB_ICONS[route];

  return (
    <Ionicons
      name={focused ? icon.active : icon.inactive}
      size={size + (focused ? 1 : 0)}
      color={color}
    />
  );
}

export default function BorrowerTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 8 : 0,
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          height: 60 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
          backgroundColor: "#FFFFFF",
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <BorrowerTabIcon
              route="Home"
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Loans"
        component={FindLoansScreen}
        options={{
          tabBarLabel: "Find Loans",
          tabBarIcon: ({ focused, color, size }) => (
            <BorrowerTabIcon
              route="Loans"
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Payments"
        component={PaymentsScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <BorrowerTabIcon
              route="Payments"
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <BorrowerTabIcon
              route="Support"
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Agreement"
        component={AgreementsListScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <BorrowerTabIcon
              route="Agreement"
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <BorrowerTabIcon
              route="Profile"
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
