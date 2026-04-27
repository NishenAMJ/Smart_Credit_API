/** @format */

import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import BorrowerStackNavigator from "./navigation/BorrowerStackNavigator";
import { setupMockSession } from "./utils/mockSession";

export default function App() {
  useEffect(() => {
    // Remove this after real auth is fully wired.
    void setupMockSession();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <BorrowerStackNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
