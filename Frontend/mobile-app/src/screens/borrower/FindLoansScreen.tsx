/** @format */

import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getApiErrorMessage } from "../../api/api-error";
import { loanService } from "../../api/services/loan.service";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import LoanCard from "../../components/borrower/LoanCard";
import SidebarMenu from "../../components/common/SidebarMenu";
import type { BorrowerLoan } from "../../types/borrower";
import type { BorrowerNavigation } from "../../types/navigation";

type FindLoansScreenProps = {
  navigation: BorrowerNavigation;
};

type DropdownKey = "location" | "amount" | "duration";

type DropdownConfig = {
  key: DropdownKey;
  label: string;
  value: string;
  options: string[];
};

/**
 * Lets borrowers discover and filter available loan offers.
 */
export default function FindLoansScreen({ navigation }: FindLoansScreenProps) {
  const [loans, setLoans] = useState<BorrowerLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Any");
  const [selectedAmount, setSelectedAmount] = useState("Any");
  const [selectedDuration, setSelectedDuration] = useState("Any");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<
    "location" | "amount" | "duration" | null
  >(null);

  const amountOptions = ["Any", "< 50,000", "50,000 - 100,000", "> 100,000"];
  const durationOptions = [
    "Any",
    "<= 6 months",
    "7 - 12 months",
    "> 12 months",
  ];

  const getLoanLocation = (loan: BorrowerLoan) =>
    loan.lenderLocation ??
    loan.location ??
    loan.city ??
    loan.district ??
    loan.province ??
    loan.branchAddress ??
    loan.address ??
    "";

  const locationOptions = useMemo(() => {
    // Build dynamic location options from API data while preserving custom user input.
    const uniqueLocations = Array.from(
      new Set(
        loans
          .map((loan) => getLoanLocation(loan).trim())
          .filter((location) => location.length > 0),
      ),
    );

    const hasSelectedLocation = uniqueLocations.some(
      (location) => location.toLowerCase() === selectedLocation.toLowerCase(),
    );

    if (selectedLocation !== "Any" && !hasSelectedLocation) {
      return ["Any", selectedLocation, ...uniqueLocations];
    }

    return ["Any", ...uniqueLocations];
  }, [loans, selectedLocation]);

  const dropdownConfig = useMemo<DropdownConfig | null>(() => {
    if (!activeDropdown) {
      return null;
    }

    if (activeDropdown === "location") {
      return {
        key: "location",
        label: "Lender Location",
        value: selectedLocation,
        options: locationOptions,
      };
    }

    if (activeDropdown === "amount") {
      return {
        key: "amount",
        label: "Loan Amount",
        value: selectedAmount,
        options: amountOptions,
      };
    }

    return {
      key: "duration",
      label: "Duration",
      value: selectedDuration,
      options: durationOptions,
    };
  }, [
    activeDropdown,
    amountOptions,
    durationOptions,
    locationOptions,
    selectedAmount,
    selectedDuration,
    selectedLocation,
  ]);

  const filterControls: DropdownConfig[] = [
    {
      key: "location",
      label: "Location",
      value: selectedLocation,
      options: locationOptions,
    },
    {
      key: "amount",
      label: "Amount",
      value: selectedAmount,
      options: amountOptions,
    },
    {
      key: "duration",
      label: "Duration",
      value: selectedDuration,
      options: durationOptions,
    },
  ];

  useEffect(() => {
    void fetchFeaturedLoans();
  }, []);

  const fetchFeaturedLoans = async () => {
    try {
      setErrorMessage("");
      const response = await loanService.getFeaturedLoans();
      const loans = response.data ?? [];

      if (loans.length === 0) {
        console.warn("No available loans returned from API");
      }

      setLoans(loans);
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Failed to load available loans.",
      );
      console.error("Error fetching available loans:", message);
      setErrorMessage(message);
      setLoans([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    void fetchFeaturedLoans();
  }, []);

  const handleSearch = async () => {
    if (searchQuery.trim() === "") {
      void fetchFeaturedLoans();
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const response = await loanService.searchLoans(searchQuery);
      setLoans(response.data ?? []);
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to search loans.");
      console.error("Error searching loans:", message);
      setErrorMessage(message);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const emptyLabel = useMemo(() => {
    if (loading) {
      return "";
    }
    if (errorMessage) {
      return errorMessage;
    }

    return searchQuery.trim()
      ? "No loans found for your search."
      : "No loans available.";
  }, [errorMessage, loading, searchQuery]);

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      if (selectedLocation !== "Any") {
        const lenderLocation = getLoanLocation(loan).toLowerCase();
        const normalizedFilter = selectedLocation.toLowerCase().trim();
        if (!lenderLocation.includes(normalizedFilter)) {
          return false;
        }
      }

      // Use max amount as primary value because most cards display an upper loan cap.
      const amountToCheck = loan.maxAmount ?? loan.amount ?? 0;
      if (selectedAmount === "< 50,000" && amountToCheck >= 50000) {
        return false;
      }
      if (
        selectedAmount === "50,000 - 100,000" &&
        (amountToCheck < 50000 || amountToCheck > 100000)
      ) {
        return false;
      }
      if (selectedAmount === "> 100,000" && amountToCheck <= 100000) {
        return false;
      }

      const durationToCheck = loan.durationMonths ?? 0;
      if (selectedDuration === "<= 6 months" && durationToCheck > 6) {
        return false;
      }
      if (
        selectedDuration === "7 - 12 months" &&
        (durationToCheck < 7 || durationToCheck > 12)
      ) {
        return false;
      }
      if (selectedDuration === "> 12 months" && durationToCheck <= 12) {
        return false;
      }

      return true;
    });
  }, [loans, selectedAmount, selectedDuration, selectedLocation]);

  const onOpenDropdown = (key: DropdownKey) => {
    setActiveDropdown(key);

    if (key === "location") {
      setLocationInput(selectedLocation === "Any" ? "" : selectedLocation);
    }
  };

  const onSelectDropdownValue = (value: string) => {
    if (activeDropdown === "location") {
      setSelectedLocation(value);
      setLocationInput(value === "Any" ? "" : value);
    } else if (activeDropdown === "amount") {
      setSelectedAmount(value);
    } else if (activeDropdown === "duration") {
      setSelectedDuration(value);
    }
    setActiveDropdown(null);
  };

  const onApplyTypedLocation = () => {
    const normalizedInput = locationInput.trim();

    // Empty input resets location filtering to the default "Any" state.
    setSelectedLocation(normalizedInput.length > 0 ? normalizedInput : "Any");
    setActiveDropdown(null);
  };

  const renderLoanCard = ({ item }: { item: BorrowerLoan }) => (
    <LoanCard
      loan={item}
      onPress={() => navigation.navigate("LoanApplication", { loan: item })}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)}>
            <Feather name='menu' size={24} color='#FFFFFF' />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find Loans</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Feather name='bell' size={20} color='#FFFFFF' />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name='map-pin' size={20} color='#FFFFFF' />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TouchableOpacity style={styles.searchIcon} onPress={handleSearch}>
          <Feather name='search' size={20} color='#007AFF' />
        </TouchableOpacity>

        <TextInput
          style={styles.searchInput}
          placeholder='Search loans...'
          placeholderTextColor='#9CA3AF'
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (text.trim() === "") {
              void fetchFeaturedLoans();
            }
          }}
          onSubmitEditing={handleSearch}
          returnKeyType='search'
        />

        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.filterIcon}
            onPress={() => {
              setSearchQuery("");
              void fetchFeaturedLoans();
            }}
          >
            <Feather name='x-circle' size={20} color='#9CA3AF' />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          {filterControls.map((control, index) => (
            <TouchableOpacity
              key={control.key}
              style={[
                styles.filterChip,
                activeDropdown === control.key && styles.filterChipActive,
                index === filterControls.length - 1 && styles.filterChipLast,
              ]}
              onPress={() => onOpenDropdown(control.key)}
            >
              <View style={styles.filterChipContent}>
                <Text style={styles.filterLabel} numberOfLines={1}>
                  {control.label}
                </Text>
                <Text style={styles.filterValue} numberOfLines={1}>
                  {control.value}
                </Text>
              </View>
              <Feather
                name='chevron-down'
                size={14}
                color='#1A1A1A'
                style={styles.filterChipIcon}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredLoans}
        renderItem={renderLoanCard}
        keyExtractor={(item, index) => item.loanId ?? String(index)}
        contentContainerStyle={styles.loanList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor='#007AFF'
          />
        }
        ListEmptyComponent={
          loading ? <Loader /> : <EmptyState title={emptyLabel} />
        }
      />

      <Modal
        visible={dropdownConfig !== null}
        transparent
        animationType='fade'
        onRequestClose={() => setActiveDropdown(null)}
      >
        <View style={styles.dropdownOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setActiveDropdown(null)}
          />
          <View style={styles.dropdownSheet}>
            <View style={styles.dropdownHeader}>
              <View>
                <Text style={styles.dropdownTitle}>
                  {dropdownConfig?.label ?? "Select option"}
                </Text>
                <Text style={styles.dropdownSubtitle}>
                  Choose one filter value to update the results.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dropdownCloseButton}
                onPress={() => setActiveDropdown(null)}
              >
                <Feather name='x' size={20} color='#6B7280' />
              </TouchableOpacity>
            </View>

            {dropdownConfig?.key === "location" ? (
              <>
                <View style={styles.locationInputSection}>
                  <Text style={styles.locationInputLabel}>
                    Type your location
                  </Text>
                  <TextInput
                    style={styles.locationInput}
                    value={locationInput}
                    onChangeText={setLocationInput}
                    placeholder='Enter city, district, or area'
                    placeholderTextColor='#9CA3AF'
                    returnKeyType='done'
                    onSubmitEditing={onApplyTypedLocation}
                  />
                  <TouchableOpacity
                    style={styles.useLocationButton}
                    onPress={onApplyTypedLocation}
                  >
                    <Text style={styles.useLocationButtonText}>
                      Use typed location
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dropdownOptionsList}>
                  <TouchableOpacity
                    style={[
                      styles.dropdownOption,
                      selectedLocation === "Any" && styles.dropdownOptionActive,
                    ]}
                    onPress={() => onSelectDropdownValue("Any")}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        selectedLocation === "Any" &&
                          styles.dropdownOptionTextActive,
                      ]}
                    >
                      Any
                    </Text>
                    {selectedLocation === "Any" ? (
                      <Feather name='check' size={18} color='#007AFF' />
                    ) : null}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.dropdownOptionsList}>
                {dropdownConfig?.options.map((option) => {
                  const isSelected = dropdownConfig.value === option;

                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownOption,
                        isSelected && styles.dropdownOptionActive,
                      ]}
                      onPress={() => onSelectDropdownValue(option)}
                    >
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          isSelected && styles.dropdownOptionTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                      {isSelected ? (
                        <Feather name='check' size={18} color='#007AFF' />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </Modal>

      <SidebarMenu
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F6FA",
  },
  header: {
    backgroundColor: "#007AFF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 15,
  },
  headerRight: {
    flexDirection: "row",
  },
  iconButton: {
    marginLeft: 15,
  },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    margin: 15,
    marginTop: 20,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A1A",
  },
  filterIcon: {
    padding: 5,
  },
  filterSection: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  filterChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  filterChipLast: {
    marginRight: 0,
  },
  filterChipActive: {
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  filterChipContent: {
    flex: 1,
  },
  filterChipIcon: {
    marginTop: 2,
  },
  filterLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  filterValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 3,
  },
  loanList: {
    paddingHorizontal: 15,
    paddingBottom: 100,
  },
  loanCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loanHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  lenderDetails: {
    flex: 1,
  },
  lenderName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  loanAmount: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  duration: {
    fontSize: 13,
    color: "#6B7280",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  loanBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 6,
  },
  featuredBadge: {
    backgroundColor: "#E0F2FE",
  },
  flexibleBadge: {
    backgroundColor: "#FEF3C7",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1A1A1A",
    marginRight: 4,
  },
  applyButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "flex-end",
  },
  dropdownSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dropdownTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  dropdownSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  dropdownCloseButton: {
    padding: 4,
    marginLeft: 12,
  },
  dropdownOptionsList: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  locationInputSection: {
    marginBottom: 12,
  },
  locationInputLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  locationInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  useLocationButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#E8F1FF",
  },
  useLocationButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#005FCC",
  },
  dropdownOption: {
    paddingHorizontal: 4,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownOptionActive: {
    backgroundColor: "#EFF6FF",
  },
  dropdownOptionText: {
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  dropdownOptionTextActive: {
    color: "#007AFF",
  },
});
