import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { commonStyles, COLORS } from "../../styles/lender.styles";
import { LenderHeader, AlertBanner } from "../../components/lender";
import { LoanOffersService } from "../../services/lender.service";

export default function EditOfferScreen({ navigation, route }: any) {
  const offerId = route?.params?.offerId || "";

  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [tenure, setTenure] = useState("12");
  const [active, setActive] = useState(true);
  const [loanType, setLoanType] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load existing offer data
  useEffect(() => {
    (async () => {
      try {
        const data = await LoanOffersService.getMyOffers();
        const offersList = Array.isArray(data) ? data : (data?.offers ?? []);
        const offer = offersList.find((o: any) => o.id === offerId);
        if (offer) {
          setMinAmount(String(offer.minAmount ?? ""));
          setMaxAmount(String(offer.maxAmount ?? ""));
          setInterestRate(String(offer.interestRate ?? ""));
          setTenure(String(offer.tenureMonths ?? "12"));
          setActive(offer.active !== false);
          setLoanType(offer.loanType ?? "personal");
        }
      } catch {
        // non-fatal — form starts empty
      } finally {
        setLoading(false);
      }
    })();
  }, [offerId]);

  const handleSave = async () => {
    if (!minAmount || !maxAmount || !interestRate) {
      Alert.alert("Validation", "Please fill all fields");
      return;
    }
    setSubmitting(true);
    try {
      await LoanOffersService.updateOffer(offerId, {
        minAmount: Number(minAmount.replace(/,/g, "")),
        maxAmount: Number(maxAmount.replace(/,/g, "")),
        interestRate: Number(interestRate),
        tenureMonths: Number(tenure),
        active,
      });
      Alert.alert("Success", "Offer updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ?? "Failed to update offer",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="Edit Offer"
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
        title="Edit Offer"
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <AlertBanner
          type="info"
          title="Editing offer"
          message="Changes will be effective immediately"
        />

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Type</Text>
          <View style={styles.readOnly}>
            <Feather name="briefcase" size={18} color={COLORS.primary} />
            <Text style={commonStyles.textPrimary}>{loanType}</Text>
          </View>
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Amount (LKR)</Text>
          <View style={styles.inputGroup}>
            <Text style={commonStyles.textSecondary}>Minimum</Text>
            <TextInput
              style={styles.input}
              value={minAmount}
              onChangeText={setMinAmount}
              keyboardType="numeric"
              editable={!submitting}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={commonStyles.textSecondary}>Maximum</Text>
            <TextInput
              style={styles.input}
              value={maxAmount}
              onChangeText={setMaxAmount}
              keyboardType="numeric"
              editable={!submitting}
            />
          </View>
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Interest Rate</Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              value={interestRate}
              onChangeText={setInterestRate}
              keyboardType="decimal-pad"
              editable={!submitting}
            />
            <Text style={styles.suffix}>% per annum</Text>
          </View>
        </View>

        <View style={commonStyles.card}>
          <View style={commonStyles.rowSpaceBetween}>
            <View>
              <Text style={commonStyles.textPrimary}>Tenure</Text>
              <Text style={commonStyles.textSecondary}>{tenure} months</Text>
            </View>
            <TextInput
              style={[styles.input, { width: 60, textAlign: "center" }]}
              value={tenure}
              onChangeText={setTenure}
              keyboardType="numeric"
              editable={!submitting}
            />
          </View>
          <View style={[commonStyles.divider, { marginVertical: 16 }]} />
          <View style={commonStyles.rowSpaceBetween}>
            <Text style={commonStyles.textPrimary}>Active</Text>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              disabled={submitting}
            />
          </View>
        </View>

        {submitting ? (
          <ActivityIndicator
            style={{ marginVertical: 20 }}
            color={COLORS.primary}
          />
        ) : (
          <TouchableOpacity
            style={commonStyles.primaryButton}
            onPress={handleSave}
          >
            <Feather name="save" size={18} color="#fff" />
            <Text style={commonStyles.buttonText}>Save Changes</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  readOnly: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  inputGroup: { marginVertical: 12 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  suffix: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
});
