/** @format */

import React from "react";
import { StyleSheet, View } from "react-native";
import EmptyState from "../../components/common/EmptyState";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        title='Profile'
        description='Manage borrower details and preferences.'
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
