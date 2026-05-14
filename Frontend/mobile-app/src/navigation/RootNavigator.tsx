import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RoleSelectScreen       from '../screens/RoleSelectScreen';
import BorrowerStackNavigator from './BorrowerStackNavigator';
import LenderStackNavigator   from './LenderStackNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* First screen — pick role */}
      <Stack.Screen name="RoleSelect"    component={RoleSelectScreen} />

      {/* Borrower side — your friend's code, untouched */}
      <Stack.Screen name="BorrowerRoot"  component={BorrowerStackNavigator} />

      {/* Lender side — yours */}
      <Stack.Screen name="LenderRoot"    component={LenderStackNavigator} />
    </Stack.Navigator>
  );
}