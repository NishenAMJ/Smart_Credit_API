/** @format */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Callout, Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getApiErrorMessage } from "../../api/api-error";
import { loanService } from "../../api/services/loan.service";
import {
  locationService,
  NearbyUserLocation,
} from "../../api/services/location.service";
import { COLORS } from "../../constants/colors";
import type { BorrowerLoan } from "../../types/borrower";
import type { BorrowerNavigation } from "../../types/navigation";

type Props = {
  navigation: BorrowerNavigation;
};

const DEFAULT_DELTA = {
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};
const RADIUS_OPTIONS = [1, 5, 10, 20, 30];

export default function NearbyLendersMapScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [region, setRegion] = useState<Region | null>(null);
  const [lenders, setLenders] = useState<NearbyUserLocation[]>([]);
  const [selectedLender, setSelectedLender] =
    useState<NearbyUserLocation | null>(null);
  const [loansByLenderId, setLoansByLenderId] = useState<
    Record<string, BorrowerLoan>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);
  const [isListVisible, setIsListVisible] = useState(true);

  const loadNearbyLenders = useCallback(async () => {
    try {
      setErrorMessage("");
      const coordinates = await locationService.getCurrentCoordinates();
      await locationService.saveMyLocation({
        ...coordinates,
        visibility: "approximate",
      });

      const nextRegion = {
        ...coordinates,
        ...DEFAULT_DELTA,
      };
      const [nearby, featuredLoansResponse] = await Promise.all([
        locationService.getNearbyLenders({
          ...coordinates,
          radiusKm,
          limit: 50,
        }),
        loanService.getFeaturedLoans(),
      ]);
      const lenderLoans = (featuredLoansResponse.data ?? []).reduce<
        Record<string, BorrowerLoan>
      >((loans, loan) => {
        if (loan.lenderId && !loans[loan.lenderId]) {
          loans[loan.lenderId] = loan;
        }

        return loans;
      }, {});

      setRegion(nextRegion);
      setLenders(nearby);
      setLoansByLenderId(lenderLoans);
      setSelectedLender(nearby[0] ?? null);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Could not load nearby lenders."),
      );
      setLenders([]);
      setLoansByLenderId({});
      setSelectedLender(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [radiusKm]);

  useEffect(() => {
    void loadNearbyLenders();
  }, [loadNearbyLenders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadNearbyLenders();
  }, [loadNearbyLenders]);

  const openLoanApplication = useCallback(
    (lender: NearbyUserLocation) => {
      const loan = loansByLenderId[lender.userId];

      if (!loan) {
        Alert.alert(
          "No Active Offer",
          "This lender does not have an active loan offer available right now.",
        );
        return;
      }

      navigation.navigate("LoanApplication", { loan });
    },
    [loansByLenderId, navigation],
  );

  const summaryText = useMemo(() => {
    if (loading) {
      return "Checking nearby lenders";
    }

    if (lenders.length === 1) {
      return "1 lender nearby";
    }

    return `${lenders.length} lenders nearby`;
  }, [lenders.length, loading]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Nearby Lenders</Text>
          <Text style={styles.headerSubtitle}>{summaryText}</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={onRefresh}>
          <Feather name="refresh-cw" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        </View>
      <View style={styles.mapWrap}>
        {region ? (
          <MapView
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            showsUserLocation
            showsMyLocationButton
          >
            {lenders.map((lender) => (
              <Marker
                key={lender.userId}
                coordinate={{
                  latitude: lender.latitude,
                  longitude: lender.longitude,
                }}
                pinColor={COLORS.primary}
                onPress={() => openLoanApplication(lender)}
              >
                <Callout onPress={() => openLoanApplication(lender)}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>
                      {loansByLenderId[lender.userId]?.lenderName ?? "Lender"}
                    </Text>
                    <Text style={styles.calloutText}>
                      {lender.distanceKm} km away
                    </Text>
                    <Text style={styles.calloutAction}>Apply now</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={styles.centerState}>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} size="large" />
            ) : (
              <Feather name="map-pin" size={36} color={COLORS.textSecondary} />
            )}
            <Text style={styles.centerStateText}>
              {loading ? "Loading map..." : errorMessage || "Map unavailable"}
            </Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom + 12, 24) },
        ]}
      >
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>Lenders Around You</Text>
            <Text style={styles.sheetSubtitle}>
              {isListVisible
                ? `Showing lenders within ${radiusKm} km.`
                : `${summaryText} within ${radiusKm} km.`}
            </Text>
          </View>
          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.locateButton} onPress={onRefresh}>
              <Feather name="crosshair" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleListButton}
              onPress={() => setIsListVisible((visible) => !visible)}
              activeOpacity={0.9}
            >
              <Feather
                name={isListVisible ? "chevron-down" : "chevron-up"}
                size={18}
                color={COLORS.primary}
              />
              
            </TouchableOpacity>
          </View>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.radiusSection}>
          <Text style={styles.radiusLabel}>Radius</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.radiusOptions}
          >
            {RADIUS_OPTIONS.map((option) => {
              const isActive = radiusKm === option;

              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.radiusChip,
                    isActive && styles.radiusChipActive,
                  ]}
                  onPress={() => setRadiusKm(option)}
                  activeOpacity={0.9}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      isActive && styles.radiusChipTextActive,
                    ]}
                  >
                    {option} km
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {isListVisible ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.resultList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {lenders.length === 0 && !loading ? (
              <View style={styles.emptyCard}>
                <Feather name="map" size={24} color={COLORS.textSecondary} />
                <Text style={styles.emptyTitle}>No nearby lenders yet</Text>
              </View>
            ) : null}

            {lenders.map((lender) => {
              const isSelected = selectedLender?.userId === lender.userId;
              const loan = loansByLenderId[lender.userId];

              return (
                <TouchableOpacity
                  key={lender.userId}
                  style={[
                    styles.resultCard,
                    isSelected && styles.resultCardActive,
                  ]}
                  onPress={() => openLoanApplication(lender)}
                  activeOpacity={0.9}
                >
                  <View style={styles.resultIcon}>
                    <Feather
                      name="briefcase"
                      size={18}
                      color={COLORS.primary}
                    />
                  </View>
                  <Text style={styles.resultTitle}>
                    {loan?.lenderName ?? "Lender"}
                  </Text>
                  <Text style={styles.resultMeta}>
                    {lender.city ?? lender.district ?? "Nearby area"}
                  </Text>
                  <Text style={styles.distanceText}>{lender.distanceKm} km</Text>
                  <View style={styles.applyHint}>
                    <Text style={styles.applyHintText}>
                      {loan ? "Apply now" : "No active offer"}
                    </Text>
                    {loan ? (
                      <Feather
                        name="arrow-right"
                        size={14}
                        color={COLORS.primary}
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#DCEBFF",
    fontSize: 12,
    marginTop: 2,
  },
  mapWrap: {
    flex: 1,
    minHeight: 320,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerStateText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  callout: {
    width: 130,
  },
  calloutTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  calloutText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  calloutAction: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  sheetSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  locateButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  toggleListButton: {
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F1FF",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
 
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    marginHorizontal: 16,
    marginTop: 10,
  },
  radiusSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  radiusLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  radiusOptions: {
    paddingRight: 16,
  },
  radiusChip: {
    minWidth: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: "#FFFFFF",
  },
  radiusChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#E8F1FF",
  },
  radiusChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  radiusChipTextActive: {
    color: COLORS.primary,
  },
  resultList: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  resultCard: {
    width: 160,
    minHeight: 118,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 12,
    marginRight: 12,
  },
  resultCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#F4F9FF",
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  resultTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  resultMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  distanceText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  applyHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  applyHintText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 4,
  },
  emptyCard: {
    width: 260,
    minHeight: 118,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 14,
    justifyContent: "center",
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 14,
    marginTop: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});
