import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LenderDashboardScreen from '../screens/lender/LenderDashboardScreen';
import MyBorrowersScreen from '../screens/lender/MyBorrowersScreen';

const Stack = createNativeStackNavigator();

export default function LenderStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LenderDashboard" component={LenderDashboardScreen} />
      <Stack.Screen name="MyBorrowers"     component={MyBorrowersScreen} />
    </Stack.Navigator>
  );
}