import React, { ComponentType } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LenderTabNavigator from './LenderTabNavigator';
import LenderProfileScreen from '../screens/lender/LenderProfileScreen';
import MyBorrowersScreen from '../screens/lender/MyBorrowersScreen';
import PaymentRemindersScreen from '../screens/lender/PaymentRemindersScreen';
import MyOffersScreen from '../screens/lender/MyOffersScreen';
import ApplicationsReceivedScreen from '../screens/lender/ApplicationsReceivedScreen';
import ActiveLoansScreen from '../screens/lender/ActiveLoansScreen';
import ReviewApplicationScreen from '../screens/lender/ReviewApplicationScreen';
import QRScannerScreen from '../screens/lender/QRScannerScreen';
import LegalActionsScreen from '../screens/lender/LegalActionsScreen';
import VerifyPaymentScreen from '../screens/lender/VerifyPaymentScreen';
import MyAdsScreen               from '../screens/lender/MyAdsScreen';
import CreateAdScreen             from '../screens/lender/CreateAdScreen';
import EditAdScreen               from '../screens/lender/EditAdScreen';
import AdAnalyticsScreen          from '../screens/lender/AdAnalyticsScreen';
import BoostAdScreen              from '../screens/lender/BoostAdScreen';
import AdSummaryAnalyticsScreen   from '../screens/lender/AdSummaryAnalyticsScreen';
import BorrowerDetailScreen from '../screens/lender/BorrowerDetailScreen';


// Use require to bypass module resolution issues
const CollectionHistoryScreen = require('../screens/lender/CollectionHistoryScreen').default as ComponentType;
const ApproveRejectScreen = require('../screens/lender/ApproveRejectScreen').default as ComponentType;
const CreateLoanOfferScreen = require('../screens/lender/CreateLoanOfferScreen').default as ComponentType;
const EditOfferScreen = require('../screens/lender/EditOfferScreen').default as ComponentType;
const LoanDetailsScreen = require('../screens/lender/LoanDetailsScreen').default as ComponentType;
const AnalyticsScreen = require('../screens/lender/AnalyticsScreen').default as ComponentType;
const PortfolioScreen = require('../screens/lender/PortfolioScreen').default as ComponentType;

const Stack = createNativeStackNavigator();

export default function LenderStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tab navigator is the first screen — shows bottom bar */}
      <Stack.Screen name="LenderTabs" component={LenderTabNavigator} />
      
      {/* Screens without bottom bar (modal-style navigation) */}
      <Stack.Screen name="LenderProfile" component={LenderProfileScreen} />
      <Stack.Screen name="MyBorrowers" component={MyBorrowersScreen} />
      <Stack.Screen name="BorrowerDetail" component={BorrowerDetailScreen} />
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
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} />
      <Stack.Screen name="LegalActions" component={LegalActionsScreen} />
      <Stack.Screen name="VerifyPayment" component={VerifyPaymentScreen} />
      <Stack.Screen name="MyAds"               component={MyAdsScreen}             />
      <Stack.Screen name="CreateAd"            component={CreateAdScreen}          />
      <Stack.Screen name="EditAd"              component={EditAdScreen}            />
      <Stack.Screen name="AdAnalytics"         component={AdAnalyticsScreen}       />
      <Stack.Screen name="BoostAd"             component={BoostAdScreen}           />
      <Stack.Screen name="AdSummaryAnalytics"  component={AdSummaryAnalyticsScreen}/>
      
    </Stack.Navigator>
  );
}