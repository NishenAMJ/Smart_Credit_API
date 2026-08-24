import React, { useEffect, useRef, useState } from "react";
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
import { getApiErrorMessage } from "../../api/api-error";

// ── Status badge color config ─────────────────────
const STATUS_STYLE: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  active: { bg: "#D1F9E6", color: "#065F46", label: "Active" },
  paused: { bg: "#FEF3C7", color: "#92400E", label: "Paused" },
  pending_review: { bg: "#EFF6FF", color: "#1D4ED8", label: "Pending review" },
  rejected: { bg: "#FEF2F2", color: "#991B1B", label: "Rejected ❌" },
  expired: { bg: "#F3F4F6", color: "#6B7280", label: "Expired" },
  draft: { bg: "#F3F4F6", color: "#4B5563", label: "Draft" },
  closed: { bg: "#E5E7EB", color: "#374151", label: "Closed" },
};

export default function MyAdsScreen({ navigation }: any) {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      void loadAds(true);
    });
    return unsubscribe;
  }, [navigation]);

  const loadAds = async (reset = true) => {
    if (!reset && (!nextCursor || loadingMoreRef.current)) return;

    try {
      if (reset) setLoading(true);
      else {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }
      const data = await AdService.getMyAds(
        undefined,
        reset ? null : nextCursor,
      );
      const incoming = data?.ads ?? [];
      setAds((current) =>
        reset
          ? incoming
          : [
              ...current,
              ...incoming.filter(
                (next) =>
                  !current.some((existing) => existing.adId === next.adId),
              ),
            ],
      );
      setNextCursor(data?.pageInfo?.nextCursor ?? null);
    } catch (error: unknown) {
      Alert.alert(
        "Could not load advertisements",
        getApiErrorMessage(error, "Failed to load advertisements."),
      );
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const handlePause = async (adId: string) => {
    try {
      await AdService.pauseAd(adId);
      void loadAds(true);
    } catch (error: unknown) {
      Alert.alert(
        "Could not pause advertisement",
        getApiErrorMessage(error, "Failed to pause advertisement."),
      );
    }
  };

  const handleActivate = async (adId: string) => {
    try {
      await AdService.activateAd(adId);
      void loadAds(true);
    } catch (error: unknown) {
      Alert.alert(
        "Could not activate advertisement",
        getApiErrorMessage(error, "Failed to activate advertisement."),
      );
    }
  };

  const FILTERS = ["all", "active", "pending_review", "paused", "rejected"];

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
            <Text
              style={{
                fontWeight: "600",
                fontSize: 12,
                color: filter === f ? "#fff" : COLORS.textPrimary,
              }}
            >
              {f.replace("_", " ").replace(/^./, (c) => c.toUpperCase())}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAd = ({ item }: any) => {
    const statusCfg = STATUS_STYLE[item.status] ?? STATUS_STYLE.active;
    const isPending = item.status === "pending_review";
    const isRejected = item.status === "rejected";
    const isActive = item.status === "active";

    return (
      <View
        style={[commonStyles.card, { marginHorizontal: 16, marginBottom: 12 }]}
      >
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
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
                backgroundColor: statusCfg.bg,
                color: statusCfg.color,
              }}
            >
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* ✅ Pending notice */}
        {isPending && (
          <View
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 8,
              backgroundColor: "#EFF6FF",
              borderLeftWidth: 3,
              borderLeftColor: "#1D4ED8",
            }}
          >
            <Text style={{ fontSize: 12, color: "#1D4ED8", fontWeight: "600" }}>
              ⏳ Awaiting admin approval before going live
            </Text>
          </View>
        )}

        {/* ✅ Rejection reason */}
        {isRejected && item.rejectionReason && (
          <View
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 8,
              backgroundColor: "#FEF2F2",
              borderLeftWidth: 3,
              borderLeftColor: COLORS.danger,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: COLORS.danger,
                fontWeight: "700",
                marginBottom: 2,
              }}
            >
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
              LKR {item.minAmount.toLocaleString()} –{" "}
              {item.maxAmount.toLocaleString()}
            </Text>
          </View>
          <View>
            <Text style={commonStyles.textSmall}>Interest</Text>
            <Text style={commonStyles.textPrimary}>
              {item.preferredInterestRate}% p.a.
            </Text>
          </View>
        </View>

        <View style={commonStyles.spacer12} />

        {/* ── Activity ── */}
        <View style={commonStyles.rowSpaceBetween}>
          <View>
            <Text style={commonStyles.textSmall}>Funded loans</Text>
            <Text style={commonStyles.textPrimary}>
              {item.fundedLoansCount ?? 0}
            </Text>
          </View>
          <View>
            <Text style={commonStyles.textSmall}>Applications</Text>
            <Text style={commonStyles.textPrimary}>
              {item.applicationCount ?? 0}
            </Text>
          </View>
        </View>

        <View style={commonStyles.spacer12} />

        {/* ── Action Buttons ── */}
        <View style={{ flexDirection: "row", gap: 6 }}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("AdAnalytics", { adId: item.adId })
            }
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: COLORS.border,
            }}
            accessibilityRole="button"
            accessibilityLabel={`View analytics for ${item.title}`}
          >
            <Feather name="bar-chart-2" size={16} color={COLORS.textPrimary} />
            <Text
              style={{
                fontSize: 10,
                color: COLORS.textPrimary,
                marginTop: 3,
                fontWeight: "600",
              }}
            >
              Analytics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("EditAd", { ad: item })}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: COLORS.border,
            }}
          >
            <Feather name="edit-2" size={16} color={COLORS.textPrimary} />
            <Text
              style={{
                fontSize: 10,
                color: COLORS.textPrimary,
                marginTop: 3,
                fontWeight: "600",
              }}
            >
              Edit
            </Text>
          </TouchableOpacity>

          {/* Pause/Resume only for active or paused ads */}
          {(isActive || item.status === "paused") && (
            <TouchableOpacity
              onPress={() =>
                isActive ? handlePause(item.adId) : handleActivate(item.adId)
              }
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: COLORS.border,
              }}
            >
              <Feather
                name={isActive ? "pause-circle" : "play-circle"}
                size={16}
                color={COLORS.textPrimary}
              />
              <Text
                style={{
                  fontSize: 10,
                  color: COLORS.textPrimary,
                  marginTop: 3,
                  fontWeight: "600",
                }}
              >
                {isActive ? "Pause" : "Resume"}
              </Text>
            </TouchableOpacity>
          )}
          {isActive && (
            <TouchableOpacity
              onPress={() => navigation.navigate("BoostAd", { ad: item })}
              disabled={item.isBoosted || ["payment_pending", "pending_verification"].includes(item.boostStatus)}
              style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.border, opacity: item.isBoosted ? 0.6 : 1 }}
            >
              <Feather name="trending-up" size={16} color={COLORS.textPrimary} />
              <Text style={{ fontSize: 10, color: COLORS.textPrimary, marginTop: 3, fontWeight: "600" }}>
                {item.isBoosted ? "Boosted" : item.boostStatus === "pending_verification" ? "Pending" : "Boost"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading)
    return (
      <SafeAreaView style={commonStyles.safe}>
        <View style={commonStyles.header}>
          <View style={commonStyles.headerFlexRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={commonStyles.headerTitle}>My Ads</Text>
            <View style={{ width: 22 }} />
          </View>
        </View>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={commonStyles.safe}>
      <View style={commonStyles.header}>
        <View style={commonStyles.headerFlexRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={commonStyles.headerTitle}>My Ads</Text>
          <TouchableOpacity onPress={() => navigation.navigate("CreateAd")}>
            <Feather name="plus" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.adId}
        renderItem={renderAd}
        onRefresh={() => void loadAds(true)}
        refreshing={loading}
        onEndReached={() => void loadAds(false)}
        onEndReachedThreshold={0.35}
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
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              style={{ paddingVertical: 16 }}
              color={COLORS.primary}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}