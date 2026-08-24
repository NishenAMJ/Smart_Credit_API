/** @format */

import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  supportQuickActions,
  type SupportQuickActionId,
} from "../../constants/supportContent";
import SidebarMenu from "../../components/common/SidebarMenu";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { TYPOGRAPHY } from "../../constants/typography";
import { BORDER_RADIUS } from "../../constants/borderRadius";
import { SHADOWS } from "../../constants/shadows";
import type { BorrowerNavigation } from "../../types/navigation";
import BorrowerPageHeader from "../../components/borrower/BorrowerPageHeader";

type SupportScreenProps = {
  navigation: BorrowerNavigation;
};

export default function SupportScreen({ navigation }: SupportScreenProps) {
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const onPressQuickAction = (actionId: SupportQuickActionId) => {
    switch (actionId) {
      case "help-center":
        navigation.navigate("HelpCenter");
        break;
      case "contact-support":
        navigation.navigate("ContactSupport");
        break;
      case "raise-dispute":
        navigation.navigate("Disputes");
        break;
    }
  };

  return (
    <View style={styles.container}>
      <BorrowerPageHeader
        title="Support"
        onMenu={() => setSidebarVisible(true)}
        actions={[
          {
            icon: "map-pin",
            label: "Open nearby lenders map",
            onPress: () => navigation.navigate("NearbyLendersMap"),
          },
          {
            icon: "bell",
            label: "Open notifications",
            onPress: () => navigation.navigate("Notifications"),
          },
        ]}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.introTitle}>How can we help?</Text>
          <Text style={styles.introText}>
            Find an answer, contact the support team, or report an issue.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.assistantCard}
          onPress={() => navigation.navigate("AiAssistant")}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Ask the AI Assistant"
        >
          <View style={styles.assistantIconWrap}>
            <Feather name="message-circle" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.assistantCopy}>
            <Text style={styles.assistantEyebrow}>AI ASSISTANT</Text>
            <Text style={styles.assistantTitle}>
              Get help with your account
            </Text>
            <Text style={styles.assistantSubtitle}>
              Ask about loans, payments, applications, or KYC.
            </Text>
          </View>
          <View style={styles.assistantArrow}>
            <Feather name="arrow-up-right" size={18} color={COLORS.primary} />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Support options</Text>
        <View style={styles.quickActionGrid}>
          {supportQuickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionCard}
              onPress={() => onPressQuickAction(action.id)}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={action.title}
            >
              <View style={styles.quickIconWrap}>
                <Feather name={action.icon} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.quickTitle}>{action.title}</Text>
              <Text style={styles.quickSubtitle}>{action.subtitle}</Text>
              <Feather
                name="arrow-right"
                size={16}
                color={COLORS.textSecondary}
                style={styles.quickArrow}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.safetyNote}>
          <Feather name="shield" size={18} color="#37546D" />
          <Text style={styles.safetyText}>
            Smart Credit support will never ask for your password, access token,
            bank PIN, or one-time password.
          </Text>
        </View>
      </ScrollView>

      <SidebarMenu
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    marginLeft: SPACING.sm,
    color: COLORS.surface,
    fontSize: TYPOGRAPHY.subtitle.fontSize,
    fontWeight: TYPOGRAPHY.subtitle.fontWeight,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  intro: {
    marginBottom: SPACING.lg,
  },
  introTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  introText: {
    marginTop: SPACING.xs,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  assistantCard: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: "#C9DCF0",
    backgroundColor: "#F4F8FC",
  },
  assistantIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2EDF8",
  },
  assistantCopy: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  assistantEyebrow: {
    marginBottom: 3,
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  assistantTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  assistantSubtitle: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  assistantArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  sectionTitle: {
    marginBottom: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  quickActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: SPACING.md,
  },
  quickActionCard: {
    width: "48.5%",
    minHeight: 154,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
    backgroundColor: "#EAF2FA",
  },
  quickTitle: {
    paddingRight: 16,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  quickSubtitle: {
    marginTop: 4,
    paddingRight: 12,
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  quickArrow: {
    position: "absolute",
    right: SPACING.md,
    top: SPACING.md,
  },
  safetyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: "#EAF0F5",
  },
  safetyText: {
    flex: 1,
    color: "#37546D",
    fontSize: 12,
    lineHeight: 18,
  },
});
