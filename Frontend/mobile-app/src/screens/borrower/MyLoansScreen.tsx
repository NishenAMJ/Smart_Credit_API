/** @format */

import React from "react";
import { StyleSheet, View } from "react-native";
import EmptyState from "../../components/common/EmptyState";

export default function MyLoansScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        title='My Loans'
        description='Track approved and active loans here.'
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
    justifyContent: "center",
  },
});
