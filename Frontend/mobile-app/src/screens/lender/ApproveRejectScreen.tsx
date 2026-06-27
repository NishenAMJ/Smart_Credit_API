import React, { useState } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { commonStyles, COLORS } from "../../styles/lender.styles";
import { LenderHeader } from "../../components/lender";
import { LoanRequestsService } from "../../services/lender.service";

export default function ApproveRejectScreen({ navigation, route }: any) {
  const { appId, action } = route?.params || {};
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isRejecting = action === "reject";

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert(
        "Required",
        `Please provide a ${isRejecting ? "reason for rejection" : "note"}`,
      );
      return;
    }
    if (!appId) {
      Alert.alert("Error", "Application ID is missing.");
      return;
    }
    setSubmitting(true);
    try {
      if (isRejecting) {
        await LoanRequestsService.rejectRequest(appId, reason.trim());
      } else {
        await LoanRequestsService.approveRequest(appId, reason.trim());
      }
      Alert.alert(
        "Success",
        `Application ${isRejecting ? "rejected" : "approved"} successfully`,
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("ApplicationsReceived"),
          },
        ],
      );
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ??
          `Failed to ${isRejecting ? "reject" : "approve"}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader
        title={isRejecting ? "Reject Application" : "Confirm Approval"}
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.decisionBox}>
          <View
            style={[
              styles.decisionIcon,
              { backgroundColor: isRejecting ? "#FEF2F2" : "#ECFDF5" },
            ]}
          >
            <Feather
              name={isRejecting ? "x-circle" : "check-circle"}
              size={48}
              color={isRejecting ? COLORS.danger : COLORS.success}
            />
          </View>
          <Text style={styles.decisionTitle}>
            {isRejecting ? "Reject Application?" : "Approve Application?"}
          </Text>
          <Text style={commonStyles.textSecondary}>
            {isRejecting
              ? "Please provide a reason for rejection"
              : "Add notes about this approval"}
          </Text>
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>
            {isRejecting ? "Reason for Rejection" : "Approval Notes"}
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder={
              isRejecting
                ? "Explain why you're rejecting..."
                : "Add any notes..."
            }
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholderTextColor={COLORS.border}
            editable={!submitting}
          />
        </View>

        {submitting ? (
          <ActivityIndicator
            style={{ marginVertical: 20 }}
            color={COLORS.primary}
          />
        ) : (
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                commonStyles.primaryButton,
                { backgroundColor: COLORS.textSecondary },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Text style={commonStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                commonStyles.primaryButton,
                {
                  backgroundColor: isRejecting ? COLORS.danger : COLORS.success,
                },
              ]}
              onPress={handleSubmit}
            >
              <Feather
                name={isRejecting ? "x" : "check"}
                size={18}
                color="#fff"
              />
              <Text style={commonStyles.buttonText}>
                {isRejecting ? "Reject" : "Approve"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  decisionBox: { alignItems: "center", marginVertical: 32 },
  decisionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  decisionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 120,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});
