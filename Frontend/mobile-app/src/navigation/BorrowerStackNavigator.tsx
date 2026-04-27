/** @format */

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BorrowerTabNavigator from "./BorrowerTabNavigator";
import MyLoansScreen from "../screens/borrower/MyLoansScreen";
import LoanDetailsScreen from "../screens/borrower/LoanDetailsScreen";
import LoanApplicationScreen from "../screens/borrower/LoanApplicationScreen";
import MyApplicationsScreen from "../screens/borrower/MyApplicationsScreen";
import ApplicationDetailsScreen from "../screens/borrower/ApplicationDetailsScreen";
import TransactionDetailsScreen from "../screens/borrower/TransactionDetailsScreen";
import CreditScoreScreen from "../screens/borrower/CreditScoreScreen";
import CreditHistoryScreen from "../screens/borrower/CreditHistoryScreen";
import HelpCenterScreen from "../screens/borrower/HelpCenterScreen";
import ContactSupportScreen from "../screens/borrower/ContactSupportScreen";
import NotificationsScreen from "../screens/borrower/NotificationsScreen";

const Stack = createNativeStackNavigator();

export default function BorrowerStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BorrowerTabs" component={BorrowerTabNavigator} />
      <Stack.Screen name="MyLoans" component={MyLoansScreen} />
      <Stack.Screen name="LoanDetails" component={LoanDetailsScreen} />
      <Stack.Screen name="LoanApplication" component={LoanApplicationScreen} />
      <Stack.Screen name="MyApplications" component={MyApplicationsScreen} />
      <Stack.Screen
        name="ApplicationDetails"
        component={ApplicationDetailsScreen}
      />
      <Stack.Screen
        name="TransactionDetails"
        component={TransactionDetailsScreen}
      />
      <Stack.Screen name="CreditScore" component={CreditScoreScreen} />
      <Stack.Screen name="CreditHistory" component={CreditHistoryScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="ContactSupport" component={ContactSupportScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
