/** @format */

import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Button from "../common/Button";

type FilterModalProps = {
  visible: boolean;
  onClose: () => void;
  onApply?: () => void;
};

/**
 * Generic borrower filter modal used for list refinements.
 */
export default function FilterModal({
  visible,
  onClose,
  onApply,
}: FilterModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Filters</Text>
          <Text style={styles.text}>
            Configure amount, duration, and lender.
          </Text>
          <Button onPress={onApply}>Apply</Button>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  text: {
    color: "#6B7280",
    fontSize: 14,
  },
  closeBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  closeText: {
    color: "#6B7280",
    fontWeight: "600",
  },
});
