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
import { LoanRequestsService } from "../../services/lender.service";

export default function ReviewApplicationScreen({ navigation, route }: any) {
  // appId can come from navigation params (from ApplicationsReceivedScreen)
  // The full `app` object may also be passed from LenderDashboardScreen
  const passedApp = route?.params?.app;
  const appId =
    route?.params?.appId || passedApp?.id || passedApp?.requestId || "unknown";

  const [app, setApp] = useState<any>(passedApp ?? null);
  const [loading, setLoading] = useState(!passedApp);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If full app object was passed directly, use it
    if (passedApp) {
      setApp(passedApp);
      return;
    }
    // Otherwise fetch from backend
    (async () => {
      try {
        const data = await LoanRequestsService.getPendingRequests({
          includeAllStatuses: true,
          pageSize: 50,
        });
        const requests: any[] = data?.requests ?? [];
        const found = requests.find(
          (r: any) => r.id === appId || r.requestId === appId,
        );
        setApp(found ?? null);
      } catch (e: any) {
        setError("Failed to load application details");
      } finally {
        setLoading(false);
      }
    })();
  }, [appId]);

  const handleApprove = async () => {
    Alert.alert(
      "Approve Application",
      "Are you sure you want to approve this loan application?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: async () => {
            setSubmitting(true);
            try {
              await LoanRequestsService.approveRequest(appId);
              Alert.alert("Success", "Application approved successfully!", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              Alert.alert(
                "Error",
                e?.response?.data?.message ?? "Failed to approve application",
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const handleReject = () => {
    navigation.navigate("ApproveReject", { appId, action: "reject" });
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="Review Application"
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

  if (!app && !loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="Review Application"
          onBackPress={() => navigation.goBack()}
        />
        <AlertBanner
          type="error"
          title="Not Found"
          message="Application not found or you don't have access."
        />
      </SafeAreaView>
    );
  }

  // Resolve fields from both dashboard-shape and loan-requests-shape
  const borrowerName = app?.borrowerName ?? app?.name ?? "Unknown";
  const borrowerId = app?.borrowerId ?? app?.id ?? "--";
  const creditScore = app?.borrowerCreditScore ?? app?.creditScore ?? null;
  const requestedAmount = app?.requestedAmount ?? app?.amount ?? 0;
  const roi =
    app?.suggestedInterestRate ?? app?.interestRate ?? app?.roi ?? "--";
  const tenureMonths = app?.tenureMonths ?? app?.duration ?? "--";
  const status = app?.status ?? "pending";
  const purpose = app?.purpose ?? "--";
  const kycStatus = app?.borrowerKycStatus ?? "--";

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader
        title="Review Application"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {error && <AlertBanner type="error" title="Error" message={error} />}

        <AlertBanner
          type="info"
          title="Application Review"
          message={`Review ${borrowerName}'s loan application`}
        />

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Applicant Details</Text>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Name</Text>
            <Text style={commonStyles.textPrimary}>{borrowerName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Borrower ID</Text>
            <Text style={commonStyles.textPrimary}>{borrowerId}</Text>
          </View>
          {creditScore !== null && (
            <View style={styles.detailRow}>
              <Text style={commonStyles.textSecondary}>Credit Score</Text>
              <Text
                style={[
                  commonStyles.textPrimary,
                  {
                    color: creditScore > 700 ? COLORS.success : COLORS.warning,
                  },
                ]}
              >
                {creditScore}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>KYC Status</Text>
            <Text style={commonStyles.textPrimary}>{kycStatus}</Text>
          </View>
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Details</Text>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Requested Amount</Text>
            <Text style={commonStyles.textPrimary}>
              LKR {(Number(requestedAmount) / 1000).toFixed(0)}K
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>
              Suggested Interest Rate
            </Text>
            <Text style={commonStyles.textPrimary}>{roi}%</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Tenure</Text>
            <Text style={commonStyles.textPrimary}>{tenureMonths} months</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Purpose</Text>
            <Text style={commonStyles.textPrimary}>{purpose}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Current Status</Text>
            <Text
              style={[
                commonStyles.textPrimary,
                { textTransform: "capitalize" },
              ]}
            >
              {status}
            </Text>
          </View>
        </View>

        {submitting ? (
          <ActivityIndicator
            style={{ marginVertical: 20 }}
            color={COLORS.primary}
            size="large"
          />
        ) : (
          <>
            {(status === "open" ||
              status === "under_review" ||
              status === "matched" ||
              status === "pending") && (
              <>
                <TouchableOpacity
                  style={commonStyles.primaryButton}
                  onPress={handleApprove}
                >
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={commonStyles.buttonText}>
                    Approve Application
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    commonStyles.primaryButton,
                    { backgroundColor: COLORS.danger },
                  ]}
                  onPress={handleReject}
                >
                  <Feather name="x" size={18} color="#fff" />
                  <Text style={commonStyles.buttonText}>
                    Reject Application
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
});
