/** @format */

import React from "react";
import { StyleSheet, View } from "react-native";
import EmptyState from "../../components/common/EmptyState";

export default function SupportScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        title='Support'
        description='Get chat or call help for your loan journey.'
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
