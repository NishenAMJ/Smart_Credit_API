/** @format */

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BorrowerTabNavigator from "./BorrowerTabNavigator";
import LoanDetailsScreen from "../screens/borrower/LoanDetailsScreen";
import LoanApplicationScreen from "../screens/borrower/LoanApplicationScreen";
import FilterLoansScreen from "../screens/borrower/FilterLoansScreen";
import MyApplicationsScreen from "../screens/borrower/MyApplicationsScreen";
import ApplicationDetailsScreen from "../screens/borrower/ApplicationDetailsScreen";
import TransactionsScreen from "../screens/borrower/TransactionsScreen";
import TransactionDetailsScreen from "../screens/borrower/TransactionDetailsScreen";
import CreditScoreScreen from "../screens/borrower/CreditScoreScreen";
import CreditHistoryScreen from "../screens/borrower/CreditHistoryScreen";

const Stack = createNativeStackNavigator();

export default function BorrowerStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='BorrowerTabs' component={BorrowerTabNavigator} />
      <Stack.Screen name='LoanDetails' component={LoanDetailsScreen} />
      <Stack.Screen name='LoanApplication' component={LoanApplicationScreen} />
      <Stack.Screen name='FilterLoans' component={FilterLoansScreen} />
      <Stack.Screen name='MyApplications' component={MyApplicationsScreen} />
      <Stack.Screen
        name='ApplicationDetails'
        component={ApplicationDetailsScreen}
      />
      <Stack.Screen name='Transactions' component={TransactionsScreen} />
      <Stack.Screen
        name='TransactionDetails'
        component={TransactionDetailsScreen}
      />
      <Stack.Screen name='CreditScore' component={CreditScoreScreen} />
      <Stack.Screen name='CreditHistory' component={CreditHistoryScreen} />
    </Stack.Navigator>
  );
}
