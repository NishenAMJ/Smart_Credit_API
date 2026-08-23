/** @format */

import React, { useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getApiErrorMessage } from "../../api/api-error";
import { applicationService } from "../../api/services/application.service";
import ApplicationCard from "../../components/borrower/ApplicationCard";
import BorrowerRefreshControl from "../../components/borrower/BorrowerRefreshControl";
import BorrowerPageHeader from "../../components/borrower/BorrowerPageHeader";
import { COLORS } from "../../constants/colors";
import { chatSocket } from "../../services/socketService";
import type { BorrowerApplication } from "../../types/borrower";
import type { BorrowerNavigation } from "../../types/navigation";

type MyApplicationsScreenProps = {
  navigation: BorrowerNavigation;
};

/**
 * Lists borrower loan applications and their current statuses.
 */
export default function MyApplicationsScreen({
  navigation,
}: MyApplicationsScreenProps) {
  const [applications, setApplications] = useState<BorrowerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      void fetchApplications();
    }, []),
  );

  React.useEffect(() => {
    const refreshApplications = () => void fetchApplications();
    chatSocket.on("agreementChanged", refreshApplications);
    chatSocket.on("socketConnected", refreshApplications);

    return () => {
      chatSocket.off("agreementChanged", refreshApplications);
      chatSocket.off("socketConnected", refreshApplications);
    };
  }, []);

  const fetchApplications = async () => {
    try {
      setErrorMessage("");
      const response = await applicationService.getMyApplications();
      setApplications(response?.data ?? []);
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Failed to load your applications.",
      );
      console.error("Error fetching applications:", message);
      setErrorMessage(message);
      setApplications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    void fetchApplications();
  }, []);

  const filteredApplications = useMemo(() => {
    if (activeFilter === "all") {
      return applications;
    }

    if (activeFilter === "pending") {
      return applications.filter((app) =>
        ["pending", "submitted", "under_review"].includes(
          String(app.status ?? "").toLowerCase(),
        ),
      );
    }

    if (activeFilter === "approved") {
      return applications.filter(
        (app) =>
          Boolean(app.convertedLoanId) ||
          ["approved", "accepted", "funded", "converted"].includes(
            String(app.status ?? "")
              .trim()
              .toLowerCase(),
          ),
      );
    }

    return applications.filter(
      (app) => (app.status ?? "").toLowerCase() === activeFilter,
    );
  }, [activeFilter, applications]);

  const renderApplication = ({ item }: { item: BorrowerApplication }) => (
    <ApplicationCard
      application={item}
      onPress={() =>
        navigation.navigate("ApplicationDetails", { application: item })
      }
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BorrowerPageHeader
        title="My Applications"
        onBack={() => navigation.goBack()}
        actions={[
          {
            icon: "bell",
            label: "Open notifications",
            onPress: () => navigation.navigate("Notifications"),
          },
        ]}
      />

      <View style={styles.filterContainer}>
        {(["all", "pending", "approved", "rejected"] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              activeFilter === filter && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter && styles.filterTextActive,
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredApplications}
        renderItem={renderApplication}
        keyExtractor={(item, index) =>
          item.requestId ?? item.applicationId ?? String(index)
        }
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <BorrowerRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {errorMessage || "No applications found"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.onPrimary,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.onPrimary,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
});
