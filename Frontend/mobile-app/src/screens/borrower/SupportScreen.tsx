/** @format */

import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supportQuickActions } from "../../constants/supportContent";
import SidebarMenu from "../../components/common/SidebarMenu";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { TYPOGRAPHY } from "../../constants/typography";
import { BORDER_RADIUS } from "../../constants/borderRadius";
import { SHADOWS } from "../../constants/shadows";
import type { BorrowerNavigation } from "../../types/navigation";
import { supportService, type SupportStatus } from "../../api/services/support.service";
import { getApiErrorMessage } from "../../api/api-error";
import { getUserId } from "../../utils/auth.storage";
import Loader from "../../components/common/Loader";

type SupportScreenProps = {
  navigation: BorrowerNavigation;
};

/**
 * Entry screen for borrower support and help resources.
 */
export default function SupportScreen({ navigation }: SupportScreenProps) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [supportStatusCards, setSupportStatusCards] = useState<SupportStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchSupportStatus = async () => {
    try {
      setErrorMessage("");
      const userId = await getUserId();
      if (userId) {
        const data = await supportService.getSupportStatus(userId);
        setSupportStatusCards(data);
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to load support status.");
      console.error("Error loading support status:", message);
      setErrorMessage(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void fetchSupportStatus();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    void fetchSupportStatus();
  }, []);

  const onPressQuickAction = (actionId: string) => {
    if (actionId === "qa-1") {
      navigation.navigate("HelpCenter");
      return;
    }

    if (actionId === "qa-2") {
      navigation.navigate("ContactSupport", {
        initialCategory: "call_request",
      });
      return;
    }

    if (actionId === "qa-3") {
      navigation.navigate("ContactSupport", {
        initialCategory: "dispute",
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)}>
            <Feather name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Support</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Feather name="bell" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="map-pin" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <View style={styles.quickActionRow}>
          {supportQuickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionCard}
              onPress={() => onPressQuickAction(action.id)}
            >
              <View style={styles.quickIconWrap}>
                <Feather name={action.icon} size={18} color="#007AFF" />
              </View>
              <Text style={styles.quickTitle}>{action.title}</Text>
              <Text style={styles.quickSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Support Status</Text>
        </View>

        {loading ? (
          <View style={{ padding: 20 }}>
            <Loader />
          </View>
        ) : (
          <View style={styles.statusCardList}>
            {supportStatusCards.map((item) => (
              <View key={item.id} style={styles.statusCard}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: item.color,
                    },
                  ]}
                />
                <View style={styles.statusInfo}>
                  <Text style={styles.statusLabel}>{item.title}</Text>
                  <Text style={styles.statusValue}>{item.value}</Text>
                  <Text style={styles.statusSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.helpCenterButton}
          onPress={() => navigation.navigate("ContactSupport")}
        >
          <Feather name="send" size={16} color="#FFFFFF" />
          <Text style={styles.helpCenterButtonText}>Contact Support</Text>
        </TouchableOpacity>
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
    paddingBottom: 15,
    paddingHorizontal: SPACING.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.subtitle.fontSize,
    fontWeight: TYPOGRAPHY.subtitle.fontWeight,
    color: COLORS.surface,
    marginLeft: SPACING.lg,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginLeft: 15,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: 28,
  },
  quickActionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.error ?? "#DC2626",
    fontSize: TYPOGRAPHY.small.fontSize,
    marginBottom: SPACING.md,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    padding: 10,
    ...SHADOWS.card,
  },
  quickIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  quickTitle: {
    fontSize: TYPOGRAPHY.small.fontSize,
    fontWeight: TYPOGRAPHY.heading.fontWeight,
    color: "#111827",
    marginBottom: SPACING.xs,
  },
  quickSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: TYPOGRAPHY.heading.fontWeight,
    color: "#111827",
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  statusCardList: {
    backgroundColor: "#FFFFFF",
    borderRadius: BORDER_RADIUS.large,
    paddingVertical: 4,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.card,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    marginRight: SPACING.sm,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.small.fontSize,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: TYPOGRAPHY.heading.fontWeight,
    color: "#111827",
    marginBottom: 3,
  },
  statusSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  helpCenterButton: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: SPACING.md,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  helpCenterButtonText: {
    color: COLORS.surface,
    marginLeft: 6,
    fontSize: 15,
    fontWeight: "600",
  },
});
