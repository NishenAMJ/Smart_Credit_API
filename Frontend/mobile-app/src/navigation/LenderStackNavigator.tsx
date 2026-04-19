import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LenderTabNavigator from './LenderTabNavigator';
import LenderProfileScreen from '../screens/lender/LenderProfileScreen';
import MyBorrowersScreen from '../screens/lender/MyBorrowersScreen';
import CollectionHistoryScreen from '../screens/lender/CollectionHistoryScreen';
import PaymentRemindersScreen from '../screens/lender/PaymentRemindersScreen';
import MyOffersScreen from '../screens/lender/MyOffersScreen';
import ApplicationsReceivedScreen from '../screens/lender/ApplicationsReceivedScreen';
import ActiveLoansScreen from '../screens/lender/ActiveLoansScreen';
import ApproveRejectScreen from '../screens/lender/ApproveRejectScreen';
import ReviewApplicationScreen from '../screens/lender/ReviewApplicationScreen';
import CreateLoanOfferScreen from '../screens/lender/CreateLoanOfferScreen';
import EditOfferScreen from '../screens/lender/EditOfferScreen';
import LoanDetailsScreen from '../screens/lender/LoanDetailsScreen';
import AnalyticsScreen from '../screens/lender/AnalyticsScreen';
import PortfolioScreen from '../screens/lender/PortfolioScreen';

const Stack = createNativeStackNavigator();

export default function LenderStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tab navigator is the first screen — shows bottom bar */}
      <Stack.Screen name="LenderTabs" component={LenderTabNavigator} />
      
      {/* Screens without bottom bar (modal-style navigation) */}
      <Stack.Screen name="LenderProfile" component={LenderProfileScreen} />
      <Stack.Screen name="MyBorrowers" component={MyBorrowersScreen} />
      <Stack.Screen name="CollectionHistory" component={CollectionHistoryScreen} />
      <Stack.Screen name="PaymentReminders" component={PaymentRemindersScreen} />
      <Stack.Screen name="MyOffers" component={MyOffersScreen} />
      <Stack.Screen name="ApplicationsReceived" component={ApplicationsReceivedScreen} />
      <Stack.Screen name="ActiveLoans" component={ActiveLoansScreen} />
      <Stack.Screen name="ApproveReject" component={ApproveRejectScreen} />
      <Stack.Screen name="ReviewApplication" component={ReviewApplicationScreen} />
      <Stack.Screen name="CreateLoanOffer" component={CreateLoanOfferScreen} />
      <Stack.Screen name="EditOffer" component={EditOfferScreen} />
      <Stack.Screen name="LoanDetails" component={LoanDetailsScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} />
      
    </Stack.Navigator>
  );
}