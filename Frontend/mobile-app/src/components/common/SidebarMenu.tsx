/** @format */

import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { BorrowerNavigation } from "../../types/navigation";
import { navigateToBorrowerTab } from "../../utils/borrowerNavigation";

type SidebarMenuProps = {
  visible: boolean;
  onClose: () => void;
  navigation: BorrowerNavigation;
};

const menuItems = [
  { label: "Home", route: "Home", icon: "home" },
  { label: "Find Loans", route: "Loans", icon: "file-text" },
  { label: "Payments", route: "Payments", icon: "credit-card" },
  { label: "Support", route: "Support", icon: "message-circle" },
  { label: "Profile", route: "Profile", icon: "user" },
  { label: "Help Center", route: "HelpCenter", icon: "help-circle" },
] as const;

export default function SidebarMenu({
  visible,
  onClose,
  navigation,
}: SidebarMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sidebar}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Smart Credit+</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.menuItem}
              onPress={() => {
                onClose();
                if (
                  item.route === "Home" ||
                  item.route === "Loans" ||
                  item.route === "Payments" ||
                  item.route === "Support" ||
                  item.route === "Profile"
                ) {
                  navigateToBorrowerTab(navigation, item.route);
                  return;
                }

                navigation.navigate(item.route);
              }}
            >
              <Feather name={item.icon} size={18} color="#111827" />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sidebar: {
    width: 270,
    backgroundColor: "#FFFFFF",
    paddingTop: 54,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuLabel: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
});
