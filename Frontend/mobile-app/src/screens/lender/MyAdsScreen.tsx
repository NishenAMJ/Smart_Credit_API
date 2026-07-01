import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { commonStyles, COLORS } from "../../styles/lender.styles";
import { AdService } from "../../services/advertisement.service";

// ── Status badge color config ─────────────────────
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: "#D1F9E6", color: "#065F46", label: "Active"   },
  paused:   { bg: "#FEF3C7", color: "#92400E", label: "Paused"   },
  pending:  { bg: "#EFF6FF", color: "#1D4ED8", label: "Pending ⏳" },
  rejected: { bg: "#FEF2F2", color: "#991B1B", label: "Rejected ❌" },
  expired:  { bg: "#F3F4F6", color: "#6B7280", label: "Expired"  },
};

export default function MyAdsScreen({ navigation }: any) {
  const [ads,     setAds]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadAds);
    return unsubscribe;
  }, [navigation]);

  const loadAds = async () => {
    try {
      setLoading(true);
      const data = await AdService.getMyAds();
      setAds(data);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to load ads");
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (adId: string) => {
    try {
      await AdService.pauseAd(adId);
      loadAds();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to pause ad");
    }
  };

  const handleActivate = async (adId: string) => {
    try {
      await AdService.activateAd(adId);
      loadAds();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to activate ad");
    }
  };

  const handleDelete = (adId: string) => {
    Alert.alert("Delete Ad", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await AdService.deleteAd(adId);
            loadAds();
          } catch (e: any) {
            Alert.alert("Error", e?.response?.data?.message || "Failed to delete ad");
          }
        },
      },
    ]);
  };

  const FILTERS = ["all", "active", "pending", "paused", "rejected"];

  const filtered = ads.filter((ad: any) => {
    if (filter === "all") return true;
    return ad.status === filter;
  });

  const renderFilterBar = () => (
    <View style={{ paddingHorizontal: 16, marginBottom: 12, marginTop: 12 }}>
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: filter === f ? COLORS.primary : COLORS.border,
            }}
          >
            <Text style={{
              fontWeight: "600",
              fontSize: 12,
              color: filter === f ? "#fff" : COLORS.textPrimary,
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAd = ({ item }: any) => {
    const statusCfg = STATUS_STYLE[item.status] ?? STATUS_STYLE.active;
    const isPending  = item.status === "pending";
    const isRejected = item.status === "rejected";
    const isActive   = item.status === "active";

    return (
      <View style={[commonStyles.card, { marginHorizontal: 16, marginBottom: 12 }]}>

        {/* ── Title + Status ── */}
        <View style={commonStyles.rowSpaceBetween}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={commonStyles.textPrimary} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[commonStyles.textSecondary, { marginTop: 4 }]}>
              {item.location}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {item.isBoosted && (
              <Text style={{ fontSize: 11, fontWeight: "600", color: COLORS.warning, marginBottom: 4 }}>
                ⚡ Boosted
              </Text>
            )}
            <Text style={{
              fontSize: 11,
              fontWeight: "700",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
              backgroundColor: statusCfg.bg,
              color: statusCfg.color,
            }}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* ✅ Pending notice */}
        {isPending && (
          <View style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 8,
            backgroundColor: "#EFF6FF",
            borderLeftWidth: 3,
            borderLeftColor: "#1D4ED8",
          }}>
            <Text style={{ fontSize: 12, color: "#1D4ED8", fontWeight: "600" }}>
              ⏳ Awaiting admin approval before going live
            </Text>
          </View>
        )}

        {/* ✅ Rejection reason */}
        {isRejected && item.rejectionReason && (
          <View style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 8,
            backgroundColor: "#FEF2F2",
            borderLeftWidth: 3,
            borderLeftColor: COLORS.danger,
          }}>
            <Text style={{ fontSize: 12, color: COLORS.danger, fontWeight: "700", marginBottom: 2 }}>
              Rejection Reason:
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.danger }}>
              {item.rejectionReason}
            </Text>
          </View>
        )}

        <View style={commonStyles.divider} />

        {/* ── Loan Terms ── */}
        <View style={commonStyles.rowSpaceBetween}>
          <View>
            <Text style={commonStyles.textSmall}>Amount Range</Text>
            <Text style={commonStyles.textPrimary}>
              LKR {item.minAmount.toLocaleString()} – {item.maxAmount.toLocaleString()}
            </Text>
          </View>
          <View>
            <Text style={commonStyles.textSmall}>Interest</Text>
            <Text style={commonStyles.textPrimary}>{item.preferredInterestRate}% p.a.</Text>
          </View>
        </View>

        <View style={commonStyles.spacer12} />

        {/* ── Stats ── */}
        <View style={commonStyles.rowSpaceBetween}>
          <View>
            <Text style={commonStyles.textSmall}>Views</Text>
            <Text style={commonStyles.textPrimary}>{item.views}</Text>
          </View>
          <View>
            <Text style={commonStyles.textSmall}>Clicks</Text>
            <Text style={commonStyles.textPrimary}>{item.clicks}</Text>
          </View>
          <View>
            <Text style={commonStyles.textSmall}>Applications</Text>
            <Text style={commonStyles.textPrimary}>{item.applicationCount}</Text>
          </View>
        </View>

        <View style={commonStyles.spacer12} />

        {/* ── Action Buttons ── */}
        <View style={{ flexDirection: "row", gap: 6 }}>

          <TouchableOpacity
            onPress={() => navigation.navigate("EditAd", { ad: item })}
            style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.border }}
          >
            <Feather name="edit-2" size={16} color={COLORS.textPrimary} />
            <Text style={{ fontSize: 10, color: COLORS.textPrimary, marginTop: 3, fontWeight: "600" }}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("AdAnalytics", { adId: item.adId })}
            style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.border }}
          >
            <Feather name="bar-chart-2" size={16} color={COLORS.textPrimary} />
            <Text style={{ fontSize: 10, color: COLORS.textPrimary, marginTop: 3, fontWeight: "600" }}>Stats</Text>
          </TouchableOpacity>

          {/* Boost only available for active ads */}
          {isActive && (
            <TouchableOpacity
              onPress={() => navigation.navigate("BoostAd", { ad: item })}
              style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.border }}
            >
              <Feather name="trending-up" size={16} color={COLORS.textPrimary} />
              <Text style={{ fontSize: 10, color: COLORS.textPrimary, marginTop: 3, fontWeight: "600" }}>Boost</Text>
            </TouchableOpacity>
          )}

          {/* Pause/Resume only for active or paused ads */}
          {(isActive || item.status === "paused") && (
            <TouchableOpacity
              onPress={() => isActive ? handlePause(item.adId) : handleActivate(item.adId)}
              style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.border }}
            >
              <Feather
                name={isActive ? "pause-circle" : "play-circle"}
                size={16}
                color={COLORS.textPrimary}
              />
              <Text style={{ fontSize: 10, color: COLORS.textPrimary, marginTop: 3, fontWeight: "600" }}>
                {isActive ? "Pause" : "Resume"}
              </Text>
            </TouchableOpacity>
          )}

        </View>

        {/* ── Delete ── */}
        <TouchableOpacity
          onPress={() => handleDelete(item.adId)}
          style={{
            marginTop: 8,
            paddingVertical: 9,
            borderRadius: 8,
            backgroundColor: "#FEF2F2",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="trash-2" size={14} color={COLORS.danger} />
          <Text style={{ marginLeft: 6, color: COLORS.danger, fontWeight: "600", fontSize: 13 }}>
            Delete
          </Text>
        </TouchableOpacity>

      </View>
    );
  };

  if (loading) return (
    <SafeAreaView style={commonStyles.safe}>
      <View style={commonStyles.header}>
        <View style={commonStyles.headerFlexRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={commonStyles.headerTitle}>My Ads</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={commonStyles.safe}>
      <View style={commonStyles.header}>
        <View style={commonStyles.headerFlexRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={commonStyles.headerTitle}>My Ads</Text>
          <TouchableOpacity onPress={() => navigation.navigate("CreateAd")}>
            <Feather name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.adId}
        renderItem={renderAd}
        onRefresh={loadAds}
        refreshing={loading}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={renderFilterBar}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Feather name="inbox" size={40} color={COLORS.textSecondary} />
            <Text style={[commonStyles.textSecondary, { marginTop: 12 }]}>
              No ads found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}