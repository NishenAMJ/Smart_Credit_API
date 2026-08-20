import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { AlertBanner, LenderHeader } from "../../components/lender";
import {
  PaymentsService,
  QrPaymentService,
} from "../../services/lender.service";
import { COLORS, commonStyles } from "../../styles/lender.styles";

export default function VerifyPaymentScreen({ navigation, route }: any) {
  const loanId: string | undefined = route?.params?.loanId;
  const qrData: string | undefined = route?.params?.qrData;
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(Boolean(loanId));
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!loanId) return;
    PaymentsService.getLoanLedger(loanId)
      .then(setLedger)
      .catch((error: any) =>
        Alert.alert(
          "Unable to load loan",
          error?.response?.data?.message ?? "Please try again.",
        ),
      )
      .finally(() => setLoading(false));
  }, [loanId]);

  const installment = useMemo(
    () =>
      (ledger?.installments ?? []).find((item: any) =>
        ["scheduled", "due", "overdue"].includes(item.status),
      ),
    [ledger],
  );

  const handleVerify = async () => {
    if (!qrData && (!loanId || !installment)) {
      Alert.alert("No payment available", "Select an unpaid loan installment.");
      return;
    }

    try {
      setSubmitting(true);
      if (qrData) {
        await QrPaymentService.recordPayment(qrData);
      } else {
        await PaymentsService.recordInstallmentPayment(
          loanId!,
          installment.id,
          Number(installment.amount),
          note,
        );
      }
      Alert.alert("Payment recorded", "The installment and loan balance were updated.", [
        { text: "OK", onPress: () => navigation.navigate("ActiveLoans") },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Payment not recorded",
        error?.response?.data?.message ?? "The payment could not be verified.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Record Payment" onBackPress={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 40 }}
          size="large"
          color={COLORS.primary}
        />
      ) : (
        <ScrollView
          style={commonStyles.scrollContainer}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <AlertBanner
            type="info"
            title={qrData ? "Verify borrower QR" : "Settle installment"}
            message={
              qrData
                ? "The server will verify the signed QR token and lender ownership before recording anything."
                : "Monthly installments must be paid once and in full."
            }
          />

          {!qrData && installment && (
            <View style={commonStyles.card}>
              <Text style={commonStyles.sectionTitle}>Next installment</Text>
              <Text style={commonStyles.textSecondary}>
                Due {installment.dueDate ? new Date(installment.dueDate).toLocaleDateString() : "--"}
              </Text>
              <Text style={[commonStyles.textPrimary, { marginTop: 8 }]}>
                LKR {Number(installment.amount ?? 0).toLocaleString()}
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Optional note"
                placeholderTextColor={COLORS.textSecondary}
                style={[commonStyles.input, { marginTop: 12 }]}
              />
            </View>
          )}

          {!qrData && !installment && (
            <AlertBanner
              type="info"
              title="No unpaid installment"
              message="This loan has no scheduled, due or overdue installment to record."
            />
          )}

          <TouchableOpacity
            style={[
              commonStyles.primaryButton,
              { opacity: submitting || (!qrData && !installment) ? 0.6 : 1 },
            ]}
            disabled={submitting || (!qrData && !installment)}
            onPress={handleVerify}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={18} color="#fff" />
                <Text style={commonStyles.buttonText}>Record Payment</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
