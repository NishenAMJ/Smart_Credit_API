import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { AdService, type AdBoostPlan } from "../../services/advertisement.service";
import { getApiErrorMessage } from "../../api/api-error";
import { COLORS, commonStyles } from "../../styles/lender.styles";

export default function BoostAdScreen({ navigation, route }: any) {
  const ad = route.params?.ad;
  const [plans, setPlans] = useState<AdBoostPlan[]>([]);
  const [planId, setPlanId] = useState("");
  const [method, setMethod] = useState<"card" | "bank_transfer">("card");
  const [bank, setBank] = useState<Record<string, string>>({});
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingBoostId, setPendingBoostId] = useState<string | null>(null);

  useEffect(() => {
    AdService.getBoostPlans()
      .then((result) => {
        setPlans(result.plans);
        setPlanId(result.plans[0]?.id ?? "");
        setBank(result.bankAccount);
      })
      .catch((error) => Alert.alert("Boost unavailable", getApiErrorMessage(error)));
  }, []);

  async function chooseReceipt() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (!result.canceled) setReceipt(result.assets[0]);
  }

  async function submit() {
    if (!ad || !planId) return;
    if (method === "bank_transfer" && (!receipt || !reference.trim())) {
      Alert.alert("Payment details required", "Select a receipt and enter the bank reference.");
      return;
    }
    try {
      setBusy(true);
      const boost = pendingBoostId
        ? { boostId: pendingBoostId }
        : await AdService.createBoost({ listingId: ad.id ?? ad.adId, planId, paymentMethod: method });
      if (method === "card") {
        const url = boost.checkout?.paymentPageUrl;
        if (!url) throw new Error("Card checkout could not be started.");
        await Linking.openURL(url);
        Alert.alert("Checkout opened", "Complete the card payment, then return to My Ads.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        return;
      }
      setPendingBoostId(boost.boostId);
      const documentId = await AdService.uploadBoostReceipt(receipt!, boost.boostId);
      await AdService.submitBoostReceipt(boost.boostId, documentId, reference.trim());
      Alert.alert("Payment submitted", "An administrator will verify your bank transfer.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Boost failed", getApiErrorMessage(error, "Could not submit the boost payment."));
    } finally {
      setBusy(false);
    }
  }

  const selectedPlan = plans.find((plan) => plan.id === planId);
  return (
    <SafeAreaView style={commonStyles.safe}>
      <View style={commonStyles.header}>
        <View style={commonStyles.headerFlexRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Feather name="arrow-left" size={22} color={COLORS.textPrimary} /></TouchableOpacity>
          <Text style={commonStyles.headerTitle}>Boost Advertisement</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={commonStyles.card}>
          <Text style={commonStyles.textPrimary}>{ad?.title}</Text>
          <Text style={[commonStyles.textSecondary, { marginTop: 6 }]}>Boosting is optional. Your approved ad stays live without it.</Text>
        </View>
        <Text style={[commonStyles.textPrimary, { marginTop: 20, marginBottom: 8 }]}>Choose a plan</Text>
        {plans.map((plan) => (
          <TouchableOpacity key={plan.id} onPress={() => setPlanId(plan.id)} style={[commonStyles.card, { marginBottom: 8, borderWidth: 2, borderColor: planId === plan.id ? COLORS.primary : "transparent" }]}>
            <View style={commonStyles.rowSpaceBetween}><Text style={commonStyles.textPrimary}>{plan.name}</Text><Text style={commonStyles.textPrimary}>LKR {(plan.amountMinor / 100).toLocaleString()}</Text></View>
          </TouchableOpacity>
        ))}
        <Text style={[commonStyles.textPrimary, { marginTop: 16, marginBottom: 8 }]}>Payment method</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["card", "bank_transfer"] as const).map((value) => (
            <TouchableOpacity key={value} onPress={() => setMethod(value)} style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: method === value ? COLORS.primary : COLORS.border }}>
              <Text style={{ textAlign: "center", fontWeight: "700", color: method === value ? "#fff" : COLORS.textPrimary }}>{value === "card" ? "Card" : "Bank transfer"}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {method === "bank_transfer" ? (
          <View style={[commonStyles.card, { marginTop: 12 }]}>
            <Text style={commonStyles.textSecondary}>Pay LKR {((selectedPlan?.amountMinor ?? 0) / 100).toLocaleString()} to {bank.bankName || "the platform bank account"}</Text>
            <Text style={[commonStyles.textPrimary, { marginTop: 6 }]}>{bank.accountName} {bank.accountNumber} {bank.branch}</Text>
            <TextInput style={[commonStyles.input, { marginTop: 12 }]} placeholder="Bank reference" value={reference} onChangeText={setReference} />
            <TouchableOpacity onPress={() => void chooseReceipt()} style={{ marginTop: 10, padding: 12, borderRadius: 8, backgroundColor: COLORS.border }}>
              <Text style={{ textAlign: "center", color: COLORS.textPrimary }}>{receipt ? receipt.fileName || "Receipt selected" : "Select payment receipt"}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <TouchableOpacity disabled={busy || !selectedPlan} onPress={() => void submit()} style={{ marginTop: 20, padding: 14, borderRadius: 8, backgroundColor: COLORS.primary, opacity: busy ? 0.6 : 1 }}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>{method === "card" ? "Pay securely" : "Submit payment"}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}