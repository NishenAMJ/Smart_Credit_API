import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { listLegalDocuments } from "../../api/services/auth.service";
import type { LegalDocument } from "../../types/auth";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";

export default function AgreementsListScreen({ navigation }: any) {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDocuments = async () => {
    try {
      setError("");
      const response = await listLegalDocuments();
      setDocuments(response.documents || []);
    } catch (err) {
      setError("Failed to load agreements. Please try again.");
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDocuments().finally(() => setLoading(false));
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDocuments();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: LegalDocument }) => {
    const isAccepted = item.status === "fully_accepted";
    const statusColor = isAccepted ? COLORS.success : COLORS.warning;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("LoanAgreement", { initialLoanId: item.loanId })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.loanId}>Loan: {item.loanId}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.replace(/_/g, " ").toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.parties}>
            <Text style={styles.partyRole}>Borrower: </Text>
            {item.borrower.fullName}
          </Text>
          <Text style={styles.parties}>
            <Text style={styles.partyRole}>Lender: </Text>
            {item.lender.fullName}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.date}>
            Updated: {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
          <Feather name="chevron-right" size={20} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Agreements</Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchDocuments()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="file-text" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No agreements found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  listContent: {
    padding: SPACING.lg,
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  loanId: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  cardBody: {
    marginBottom: SPACING.md,
  },
  parties: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 4,
  },
  partyRole: {
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    padding: SPACING.lg,
    alignItems: "center",
  },
  errorText: {
    color: COLORS.error,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
});
