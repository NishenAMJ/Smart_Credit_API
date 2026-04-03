import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LenderTabNavigator from './LenderTabNavigator';
import MyBorrowersScreen from '../screens/lender/MyBorrowersScreen';
import CollectionHistoryScreen from '../screens/lender/CollectionHistoryScreen';
import PaymentREmindersScreen from '../screens/lender/PaymentRemindersScreen';
import MyOffersScreen from '../screens/lender/MyOffersScreen';
import ApplicationsReceivedScreen from '../screens/lender/ApplicationsReceivedScreen';
import ActiveLoansScreen from '../screens/lender/ActiveLoansScreen';
import ApproveRejectScreen from '../screens/lender/ApproveRejectScreen';

const Stack = createNativeStackNavigator();

export default function LenderStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tab navigator is the first screen — shows bottom bar */}
      <Stack.Screen name="LenderTabs" component={LenderTabNavigator} />
      {/* Screens without bottom bar */}
      <Stack.Screen name="MyBorrowers" component={MyBorrowersScreen} />
      <Stack.Screen name="CollectionHistory" component={CollectionHistoryScreen} />
      <Stack.Screen name="PaymentReminders" component={PaymentREmindersScreen} />
      <Stack.Screen name="MyOffers" component={MyOffersScreen} />
      <Stack.Screen name="ApplicationsReceived" component={ApplicationsReceivedScreen} />
      <Stack.Screen name="ActiveLoans" component={ActiveLoansScreen} />
      <Stack.Screen name="ApproveReject" component={ApproveRejectScreen} />
    </Stack.Navigator>
  );
}