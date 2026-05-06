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
import { LoanOffersService } from "../../services/lender.service";

type FilterType = "all" | "active" | "withdrawn" | "accepted";

export default function MyOffersScreen({ navigation }: any) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await LoanOffersService.getMyOffers();
        // Backend returns an array directly from GET /api/lender/:id/offers
        setOffers(Array.isArray(data) ? data : (data?.offers ?? []));
      } catch (e: any) {
        setError(e?.response?.data?.message ?? "Failed to load offers");
        setOffers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = offers.filter(
    (o) => filter === "all" || (o.status ?? "active") === filter,
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return COLORS.success;
      case "withdrawn":
        return COLORS.danger;
      case "accepted":
        return COLORS.primary;
      default:
        return COLORS.textSecondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="My Offers"
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
      <LenderHeader title="My Offers" onBackPress={() => navigation.goBack()} />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {error && <AlertBanner type="error" title="Error" message={error} />}

        <View style={styles.filters}>
          {(["all", "active", "withdrawn", "accepted"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.btn, filter === f && styles.btnActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[styles.btnText, filter === f && styles.btnTextActive]}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <AlertBanner
            type="info"
            title="No Offers"
            message={`No ${filter === "all" ? "" : filter + " "}offers found`}
          />
        ) : (
          filtered.map((offer) => (
            <TouchableOpacity
              key={offer.id}
              style={commonStyles.card}
              onPress={() =>
                navigation.push("LoanDetails", { offerId: offer.id })
              }
            >
              <View style={commonStyles.rowSpaceBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={commonStyles.sectionTitle}>
                    {offer.loanType ?? offer.type ?? "Loan Offer"}
                  </Text>
                  <Text style={commonStyles.textSecondary}>{offer.id}</Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: getStatusColor(offer.status ?? "active"),
                    },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {(offer.status ?? "active").toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={commonStyles.spacer32} />

              <View style={commonStyles.rowSpaceBetween}>
                <View>
                  <Text style={commonStyles.textSecondary}>
                    Min – Max Amount
                  </Text>
                  <Text style={commonStyles.textPrimary}>
                    LKR {((offer.minAmount ?? 0) / 1000).toFixed(0)}K –{" "}
                    {((offer.maxAmount ?? 0) / 1000).toFixed(0)}K
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={commonStyles.textSecondary}>Interest Rate</Text>
                  <Text style={commonStyles.textPrimary}>
                    {offer.interestRate ?? offer.roi ?? "--"}%
                  </Text>
                </View>
              </View>

              <Text style={[commonStyles.textSecondary, { marginTop: 12 }]}>
                Tenure: {offer.tenureMonths ?? offer.duration ?? "--"} months
              </Text>

              {(offer.status ?? "active") === "active" && (
                <TouchableOpacity
                  style={[commonStyles.primaryButton, { marginTop: 12 }]}
                  onPress={() =>
                    navigation.push("EditOffer", { offerId: offer.id })
                  }
                >
                  <Feather name="edit" size={16} color="#fff" />
                  <Text style={commonStyles.buttonText}>Edit Offer</Text>
                </TouchableOpacity>
              )}
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
