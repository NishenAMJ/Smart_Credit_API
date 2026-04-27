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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getFeaturedLoans, searchLoans } from "../../api/services/loan.service";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import LoanCard from "../../components/borrower/LoanCard";

type Loan = {
  loanId: string;
  lenderName?: string;
  lenderLocation?: string;
  location?: string;
  city?: string;
  district?: string;
  province?: string;
  branchAddress?: string;
  address?: string;
  minAmount?: number;
  maxAmount?: number;
  durationMonths?: number;
  amount?: number;
  isFeatured?: boolean;
  interestRate?: number;
};

type FindLoansScreenProps = {
  navigation: any;
};

export default function FindLoansScreen({ navigation }: FindLoansScreenProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("Any");
  const [selectedAmount, setSelectedAmount] = useState("Any");
  const [selectedDuration, setSelectedDuration] = useState("Any");
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

  const getLoanLocation = (loan: Loan) =>
    loan.lenderLocation ??
    loan.location ??
    loan.city ??
    loan.district ??
    loan.province ??
    loan.branchAddress ??
    loan.address ??
    "";

  const locationOptions = useMemo(() => {
    const uniqueLocations = Array.from(
      new Set(
        loans
          .map((loan) => getLoanLocation(loan).trim())
          .filter((location) => location.length > 0),
      ),
    );

    return ["Any", ...uniqueLocations];
  }, [loans]);

  useEffect(() => {
    void fetchFeaturedLoans();
  }, []);

  const fetchFeaturedLoans = async () => {
    try {
      const data = await getFeaturedLoans();
      setLoans((data as Loan[]) ?? []);
    } catch (error) {
      console.error("Error fetching loans:", error);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim() === "") {
      return;
    }

    try {
      setLoading(true);
      const data = await searchLoans(searchQuery);
      setLoans((data as Loan[]) ?? []);
    } catch (error) {
      console.error("Error searching loans:", error);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const emptyLabel = useMemo(() => {
    if (loading) {
      return "";
    }
    return searchQuery.trim()
      ? "No loans found for your search."
      : "No loans available.";
  }, [loading, searchQuery]);

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      if (selectedLocation !== "Any") {
        const lenderLocation = getLoanLocation(loan).toLowerCase();
        if (lenderLocation !== selectedLocation.toLowerCase()) {
          return false;
        }
      }

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

  const dropdownOptions =
    activeDropdown === "location"
      ? locationOptions
      : activeDropdown === "amount"
        ? amountOptions
        : durationOptions;

  const onSelectDropdownValue = (value: string) => {
    if (activeDropdown === "location") {
      setSelectedLocation(value);
    } else if (activeDropdown === "amount") {
      setSelectedAmount(value);
    } else if (activeDropdown === "duration") {
      setSelectedDuration(value);
    }
    setActiveDropdown(null);
  };

  const renderLoanCard = ({ item }: { item: Loan }) => (
    <LoanCard
      loan={item}
      onPress={() => navigation.navigate("LoanDetails", { loan: item })}
    />
  );

  if (loading) {
    return <Loader />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name='menu' size={24} color='#FFFFFF' />
          <Text style={styles.headerTitle}>Find Loans</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name='map-pin' size={20} color='#FFFFFF' />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name='filter' size={20} color='#FFFFFF' />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Feather
          name='search'
          size={20}
          color='#6B7280'
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder='Search loans...'
          placeholderTextColor='#9CA3AF'
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType='search'
        />
        <TouchableOpacity style={styles.filterIcon} onPress={handleSearch}>
          <Feather name='sliders' size={20} color='#6B7280' />
        </TouchableOpacity>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => setActiveDropdown("location")}
          >
            <Text style={styles.filterLabel}>Lender Location:</Text>
            <Text style={styles.filterValue}>{selectedLocation}</Text>
            <Feather name='chevron-down' size={16} color='#1A1A1A' />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filtersButton}
            onPress={() => navigation.navigate("FilterLoans")}
          >
            <Text style={styles.filtersButtonText}>Filters</Text>
            <Feather name='chevron-down' size={16} color='#1A1A1A' />
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => setActiveDropdown("amount")}
          >
            <Text style={styles.filterLabel}>Loan Amount:</Text>
            <Text style={styles.filterValue}>{selectedAmount}</Text>
            <Feather name='chevron-down' size={16} color='#1A1A1A' />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => setActiveDropdown("duration")}
          >
            <Text style={styles.filterLabel}>Duration:</Text>
            <Text style={styles.filterValue}>{selectedDuration}</Text>
            <Feather name='chevron-down' size={16} color='#1A1A1A' />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredLoans}
        renderItem={renderLoanCard}
        keyExtractor={(item, index) => item.loanId ?? String(index)}
        contentContainerStyle={styles.loanList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title={emptyLabel} />}
      />

      <Modal
        visible={activeDropdown !== null}
        transparent
        animationType='fade'
        onRequestClose={() => setActiveDropdown(null)}
      >
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setActiveDropdown(null)}
        >
          <View style={styles.dropdownSheet}>
            {dropdownOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.dropdownOption}
                onPress={() => onSelectDropdownValue(option)}
              >
                <Text style={styles.dropdownOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  filterLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginRight: 5,
  },
  filterValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    marginRight: 5,
  },
  filtersButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  filtersButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    marginRight: 5,
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
    paddingTop: 10,
  },
  dropdownOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownOptionText: {
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "500",
  },
});
