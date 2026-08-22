import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  SafeAreaView,
  Alert,
  StyleSheet,
} from "react-native";
import { commonStyles, COLORS } from "../../styles/lender.styles";
import { AdService } from "../../services/advertisement.service";
import { getApiErrorMessage } from "../../api/api-error";

export default function BoostAdScreen({ route, navigation }: any) {
  const { ad } = route.params ?? {};
  const [amount, setAmount] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!ad || !ad.adId) return;
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Validation", "Enter a valid amount to boost.");
      return;
    }
    if (!paymentReference || paymentReference.trim().length === 0) {
      Alert.alert("Validation", "Payment reference is required.");
      return;
    }
    try {
      setSubmitting(true);
      await AdService.requestBoost(ad.adId, {
        amount: parsed,
        paymentReference,
        message,
      });
      Alert.alert("Boost requested", "Your boost request was submitted.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: unknown) {
      Alert.alert(
        "Could not request boost",
        getApiErrorMessage(error, "Failed to submit boost request."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <View style={commonStyles.header}>
        <View style={commonStyles.headerFlexRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 18, color: COLORS.textPrimary }}>Back</Text>
          </TouchableOpacity>
          <Text style={commonStyles.headerTitle}>Boost Advertisement</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>

      <View style={{ padding: 16 }}>
        <Text style={styles.label}>Ad</Text>
        <Text style={commonStyles.textPrimary}>{ad?.title}</Text>

        <Text style={styles.label}>Amount (LKR)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
          placeholder="e.g. 1000"
        />

        <Text style={styles.label}>Payment reference</Text>
        <TextInput
          value={paymentReference}
          onChangeText={setPaymentReference}
          style={styles.input}
          placeholder="Bank ref or transaction id"
        />

        <Text style={styles.label}>Message (optional)</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          style={[styles.input, { height: 80 }]}
          multiline
        />

        <View style={{ marginTop: 16 }}>
          <Button
            title={submitting ? "Submitting..." : "Submit Boost Request"}
            onPress={submit}
            disabled={
              submitting || !amount || Number.isNaN(Number(amount)) || !paymentReference
            }
            color={COLORS.primary}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 12, fontSize: 12, color: COLORS.textSecondary },
  input: {
    marginTop: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
  },
});
