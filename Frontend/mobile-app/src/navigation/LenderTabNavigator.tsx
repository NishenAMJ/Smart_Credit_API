/** @format */

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import LenderHomeScreen from "../screens/lender/LenderHomeScreen";
import LenderKycScreen from "../screens/lender/LenderKycScreen";
import LenderProfileScreen from "../screens/lender/LenderProfileScreen";
import LegalAgreementScreen from "../screens/lender/LegalAgreementScreen";

const Tab = createBottomTabNavigator();

export default function LenderTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name='LenderHome'
        component={LenderHomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name='home' size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name='LenderKyc'
        component={LenderKycScreen}
        options={{
          title: "KYC",
          tabBarIcon: ({ color, size }) => (
            <Feather name='shield' size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name='LenderAgreement'
        component={LegalAgreementScreen}
        options={{
          title: "Agreement",
          tabBarIcon: ({ color, size }) => (
            <Feather name='file-text' size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name='LenderProfile'
        component={LenderProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name='user' size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
