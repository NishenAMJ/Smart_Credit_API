import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { commonStyles, COLORS } from "../../styles/lender.styles";
import { LenderHeader, AlertBanner } from "../../components/lender";
import { PaymentRemindersService } from "../../services/lender.service";

type TabType = "pending" | "sent" | "paid";

export default function PaymentRemindersScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await PaymentRemindersService.getReminders();
        // Backend returns { data: [...] } or raw array
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setReminders(list);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? "Failed to load reminders");
        setReminders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = reminders.filter(
    (r) => (r.status ?? "pending") === activeTab,
  );

  const getStatusIcon = (s: string) => {
    switch (s) {
      case "pending":
        return "clock";
      case "sent":
        return "send";
      case "paid":
        return "check-circle";
      default:
        return "info";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="Payment Reminders"
          onBackPress={() => navigation.goBack()}
        />
        <ActivityIndicator
          style={{ marginTop: 40 }}
          color={COLORS.primary}
          size="large"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader
        title="Payment Reminders"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {error && <AlertBanner type="error" title="Error" message={error} />}

        <View style={styles.tabBar}>
          {(["pending", "sent", "paid"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <AlertBanner
            type="info"
            title="No Reminders"
            message={`No ${activeTab} reminders`}
          />
        ) : (
          filtered.map((reminder) => (
            <View key={reminder.id} style={commonStyles.card}>
              <View style={commonStyles.rowSpaceBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={commonStyles.sectionTitle}>
                    {reminder.borrowerName ?? "Unknown"}
                  </Text>
                  <Text style={commonStyles.textSecondary}>
                    {reminder.loanId ?? reminder.id}
                  </Text>
                </View>
                <Feather
                  name={getStatusIcon(reminder.status ?? "pending")}
                  size={20}
                  color={COLORS.primary}
                />
              </View>

              <View style={commonStyles.spacer32} />

              <View style={commonStyles.rowSpaceBetween}>
                <View>
                  <Text style={commonStyles.textSecondary}>Amount Due</Text>
                  <Text style={commonStyles.textPrimary}>
                    LKR {Number(reminder.amountDue ?? 0).toLocaleString()}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={commonStyles.textSecondary}>Due Date</Text>
                  <Text style={commonStyles.textPrimary}>
                    {reminder.dueDate ? formatDate(reminder.dueDate) : "--"}
                  </Text>
                </View>
              </View>

              {(reminder.status ?? "pending") === "pending" && (
                <TouchableOpacity
                  style={[commonStyles.primaryButton, { marginTop: 12 }]}
                  onPress={() =>
                    Alert.alert(
                      "Reminder",
                      `Reminder sent to ${reminder.borrowerName ?? "borrower"}`,
                    )
                  }
                >
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={commonStyles.buttonText}>Send Reminder</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
});
