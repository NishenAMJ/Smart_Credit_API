/** @format */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import {
  locationService,
  NearbyUserLocation,
} from "../../api/services/location.service";
import { COLORS } from "../../constants/colors";
import { LenderHeader } from "../../components/lender";

type Props = {
  navigation: any;
};

const DEFAULT_DELTA = {
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};
const RADIUS_OPTIONS = [1, 5, 10, 20, 30];

export default function BorrowerMapScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [region, setRegion] = useState<Region | null>(null);
  const [borrowers, setBorrowers] = useState<NearbyUserLocation[]>([]);
  const [selectedBorrower, setSelectedBorrower] =
    useState<NearbyUserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);

  const loadBorrowers = useCallback(async () => {
    try {
      setErrorMessage("");
      const coordinates = await locationService.getCurrentCoordinates();
      await locationService.saveMyLocation({
        ...coordinates,
        visibility: "exact",
      });

      const nextRegion = {
        ...coordinates,
        ...DEFAULT_DELTA,
      };
      const nearby = await locationService.getNearbyBorrowers({
        ...coordinates,
        radiusKm,
        limit: 50,
      });

      setRegion(nextRegion);
      setBorrowers(nearby);
      setSelectedBorrower(nearby[0] ?? null);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Could not load borrower locations."),
      );
      setBorrowers([]);
      setSelectedBorrower(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [radiusKm]);

  useEffect(() => {
    void loadBorrowers();
  }, [loadBorrowers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadBorrowers();
  }, [loadBorrowers]);

  const summaryText = useMemo(() => {
    if (loading) {
      return "Checking borrower locations";
    }

    if (borrowers.length === 1) {
      return "1 borrower visible";
    }

    return `${borrowers.length} borrowers visible`;
  }, [borrowers.length, loading]);

  return (
    <View style={styles.container}>
      <LenderHeader title="Borrower Map" onBackPress={() => navigation.goBack()} />

      <View style={styles.mapWrap}>
        {region ? (
          <MapView
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            showsUserLocation
            showsMyLocationButton
          >
            {borrowers.map((borrower) => (
              <Marker
                key={borrower.userId}
                coordinate={{
                  latitude: borrower.latitude,
                  longitude: borrower.longitude,
                }}
                pinColor={COLORS.warning}
                onPress={() => setSelectedBorrower(borrower)}
              >
                <Callout onPress={() => setSelectedBorrower(borrower)}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>Borrower</Text>
                    <Text style={styles.calloutText}>
                      {borrower.distanceKm} km away
                    </Text>
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
            <Text style={styles.sheetTitle}>Related Borrowers</Text>
            <Text style={styles.sheetSubtitle}>{summaryText}</Text>
          </View>
          <TouchableOpacity style={styles.locateButton} onPress={onRefresh}>
            <Feather name="crosshair" size={18} color={COLORS.primary} />
          </TouchableOpacity>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.resultList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {borrowers.length === 0 && !loading ? (
            <View style={styles.emptyCard}>
              <Feather name="users" size={24} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>No borrower locations yet</Text>
              <Text style={styles.emptyText}>
                Borrowers appear here after they save location and have a request
                or relationship with you.
              </Text>
            </View>
          ) : null}

          {borrowers.map((borrower) => {
            const isSelected = selectedBorrower?.userId === borrower.userId;

            return (
              <TouchableOpacity
                key={borrower.userId}
                style={[styles.resultCard, isSelected && styles.resultCardActive]}
                onPress={() => setSelectedBorrower(borrower)}
                activeOpacity={0.9}
              >
                <View style={styles.resultIcon}>
                  <Feather name="user" size={18} color={COLORS.warning} />
                </View>
                <Text style={styles.resultTitle}>Borrower</Text>
                <Text style={styles.resultMeta}>
                  {borrower.city ?? borrower.district ?? "Nearby area"}
                </Text>
                <Text style={styles.distanceText}>{borrower.distanceKm} km</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapWrap: {
    flex: 1,
    minHeight: 360,
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
    borderColor: COLORS.warning,
    backgroundColor: "#FFFBEB",
  },
  radiusChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  radiusChipTextActive: {
    color: COLORS.warning,
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
    borderColor: COLORS.warning,
    backgroundColor: "#FFFBEB",
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
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
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  emptyCard: {
    width: 280,
    minHeight: 126,
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
