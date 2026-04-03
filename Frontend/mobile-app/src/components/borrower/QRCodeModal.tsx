/** @format */

import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type QRCodeModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function QRCodeModal({ visible, onClose }: QRCodeModalProps) {
  return (
    <Modal visible={visible} transparent animationType='fade'>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>QR Code</Text>
          <View style={styles.qrBox}>
            <Text style={styles.qrText}>QR</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>Close</Text>
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
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  qrBox: {
    width: 180,
    height: 180,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  qrText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6B7280",
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
