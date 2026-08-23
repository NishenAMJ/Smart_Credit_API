/** @format */

import React from "react";
import {
  Modal,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BorrowerNavigation } from "../../types/navigation";
import { navigateToBorrowerTab } from "../../utils/borrowerNavigation";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../constants/colors";

type SidebarMenuProps = {
  visible: boolean;
  onClose: () => void;
  navigation: BorrowerNavigation;
};

const menuSections = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Home", route: "Home", icon: "home", tab: true },
      {
        label: "Find Loans",
        route: "Loans",
        icon: "search",
        tab: true,
      },
      {
        label: "Payments",
        route: "Payments",
        icon: "credit-card",
        tab: true,
      },
    ],
  },
  {
    title: "MY CREDIT",
    items: [
      {
        label: "My Applications",
        route: "MyApplications",
        icon: "file-text",
        tab: false,
      },
      {
        label: "My Loans",
        route: "MyLoans",
        icon: "briefcase",
        tab: false,
      },
      {
        label: "Agreements",
        route: "Agreement",
        icon: "edit-3",
        tab: true,
      },
      {
        label: "Credit Score",
        route: "CreditScore",
        icon: "activity",
        tab: false,
      },
    ],
  },
  {
    title: "ACCOUNT & SUPPORT",
    items: [
      {
        label: "Support",
        route: "Support",
        icon: "message-circle",
        tab: true,
      },
      {
        label: "Help Center",
        route: "HelpCenter",
        icon: "help-circle",
        tab: false,
      },
      {
        label: "Profile",
        route: "Profile",
        icon: "user",
        tab: true,
      },
    ],
  },
] as const;

export default function SidebarMenu({
  visible,
  onClose,
  navigation,
}: SidebarMenuProps) {
  const { signOut, session } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sidebarWidth = Math.min(width * 0.86, 340);
  const fullName = session?.user.fullName?.trim() || "Borrower";
  const email = session?.user.email?.trim() || "Smart Credit+ account";
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const currentRouteName = (() => {
    let state = (navigation as any).getState?.();
    let route = state?.routes?.[state.index];
    while (route?.state) {
      state = route.state;
      route = state.routes?.[state.index];
    }
    return route?.name as string | undefined;
  })();

  const onLogOut = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          onClose();
          signOut();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sidebar,
            {
              width: sidebarWidth,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.profileHeader}>
            <View style={styles.headerRow}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <Feather name="trending-up" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.title}>Smart Credit+</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Close navigation menu"
              >
                <Feather name="x" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials || "B"}</Text>
              </View>
              <View style={styles.profileCopy}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {fullName}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {email}
                </Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>BORROWER</Text>
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator={false}
          >
            {menuSections.map((section) => (
              <View key={section.title} style={styles.menuSection}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.map((item) => {
                  const isActive = currentRouteName === item.route;
                  return (
                    <TouchableOpacity
                      key={item.route}
                      style={[
                        styles.menuItem,
                        isActive && styles.menuItemActive,
                      ]}
                      activeOpacity={0.72}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                      onPress={() => {
                        onClose();
                        if (item.tab) {
                          navigateToBorrowerTab(navigation, item.route);
                          return;
                        }

                        navigation.navigate(item.route);
                      }}
                    >
                      <View
                        style={[
                          styles.iconBox,
                          isActive && styles.iconBoxActive,
                        ]}
                      >
                        <Feather
                          name={item.icon}
                          size={18}
                          color={isActive ? COLORS.primary : "#475569"}
                        />
                      </View>
                      <Text
                        style={[
                          styles.menuLabel,
                          isActive && styles.menuLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Feather
                        name="chevron-right"
                        size={17}
                        color={isActive ? COLORS.primary : "#CBD5E1"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.logoutItem}
              onPress={onLogOut}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <View style={styles.logoutIconBox}>
                <Feather name="log-out" size={18} color="#DC2626" />
              </View>
              <Text style={styles.logoutLabel}>Log Out</Text>
            </TouchableOpacity>
            <Text style={styles.footerText}>Secure lending, made simpler.</Text>
          </View>
        </View>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close navigation menu"
        />
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
    backgroundColor: "rgba(15, 23, 42, 0.52)",
  },
  sidebar: {
    backgroundColor: "#F8FAFC",
    shadowColor: "#0F172A",
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 18,
  },
  profileHeader: {
    marginHorizontal: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    marginRight: 10,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
    marginRight: 11,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
  },
  profileEmail: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 3,
  },
  roleBadge: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
  },
  roleText: {
    color: "#047857",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 10,
  },
  menuSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginLeft: 10,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    paddingHorizontal: 9,
    borderRadius: 13,
    marginBottom: 3,
  },
  menuItemActive: {
    backgroundColor: "#EAF3FF",
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2F7",
  },
  iconBoxActive: {
    backgroundColor: "#FFFFFF",
  },
  menuLabel: {
    flex: 1,
    marginLeft: 11,
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  menuLabelActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: 9,
    borderRadius: 13,
    backgroundColor: "#FFF1F2",
  },
  logoutIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  logoutLabel: {
    marginLeft: 11,
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 10,
    textAlign: "center",
    marginTop: 9,
  },
});
