import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { commonStyles, COLORS } from "../../styles/lender.styles";
import { LenderHeader, AlertBanner } from "../../components/lender";
import { LoanRequestsService } from "../../services/lender.service";

export default function ApplicationsReceivedScreen({ navigation }: any) {
  const [filter, setFilter] = useState<
    "all" | "submitted" | "under_review" | "converted" | "rejected"
  >("all");
  const [allApps, setAllApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await LoanRequestsService.getPendingRequests({
          includeAllStatuses: true,
          pageSize: 50,
        });
        setAllApps(data?.requests ?? []);
      } catch {
        setAllApps([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = allApps.filter(
    (a) => filter === "all" || (a.status ?? "").toLowerCase() === filter,
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return COLORS.warning;
      case "under_review":
        return COLORS.primary;
      case "converted":
        return COLORS.success;
      case "rejected":
        return COLORS.danger;
      default:
        return COLORS.textSecondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="Applications Received"
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
        title="Applications Received"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.filters}>
          {(["all", "submitted", "under_review", "converted", "rejected"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.btn, filter === f && styles.btnActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[styles.btnText, filter === f && styles.btnTextActive]}
              >
                {f === "all"
                  ? "All"
                  : f.replace("_", " ").replace(/^./, (c) => c.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <AlertBanner
            type="info"
            title="No Applications"
            message={`No ${filter} applications found`}
          />
        ) : (
          filtered.map((app, index) => (
            <TouchableOpacity
              key={app.requestId ?? index}
              style={commonStyles.card}
              onPress={() =>
                navigation.push("ReviewApplication", {
                  appId: app.requestId,
                  app,
                })
              }
            >
              <View style={commonStyles.rowSpaceBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={commonStyles.sectionTitle}>
                    {app.borrowerName ?? app.borrower}
                  </Text>
                  <Text style={commonStyles.textSecondary}>
                    Application ...{String(app.requestId ?? "").slice(-6)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: getStatusColor(app.status ?? "submitted"),
                    },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {(app.status ?? "submitted").replace("_", " ").toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={commonStyles.spacer32} />

              <View style={commonStyles.rowSpaceBetween}>
                <View>
                  <Text style={commonStyles.textSecondary}>
                    Amount Requested
                  </Text>
                  <Text style={commonStyles.textPrimary}>
                    LKR{" "}
                    {((app.requestedAmount ?? app.amount ?? 0) / 1000).toFixed(
                      0,
                    )}
                    K
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={commonStyles.textSecondary}>ROI</Text>
                  <Text style={commonStyles.textPrimary}>
                    {app.suggestedInterestRate ?? "--"}%
                  </Text>
                </View>
              </View>

              <Text style={[commonStyles.textSecondary, { marginTop: 12 }]}>
                Applied:{" "}
                {app.createdAt
                  ? new Date(app.createdAt).toLocaleDateString()
                  : "--"}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  btnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  btnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  btnTextActive: {
    color: "#fff",
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
