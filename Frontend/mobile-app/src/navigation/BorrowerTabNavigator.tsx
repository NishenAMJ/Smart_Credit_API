/** @format */

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import FindLoansScreen from "../screens/borrower/FindLoansScreen";
import MyLoansScreen from "../screens/borrower/MyLoansScreen";
import PaymentsScreen from "../screens/borrower/PaymentsScreen";
import SupportScreen from "../screens/borrower/SupportScreen";
import ProfileScreen from "../screens/borrower/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function BorrowerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name='Home'
        component={FindLoansScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name='home' size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name='Loans'
        component={MyLoansScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name='file-text' size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name='Payments'
        component={PaymentsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name='credit-card' size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name='Support'
        component={SupportScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name='message-circle' size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name='Profile'
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Feather name='user' size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
