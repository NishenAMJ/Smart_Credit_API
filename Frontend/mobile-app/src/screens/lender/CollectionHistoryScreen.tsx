import React, { useState, useEffect } from "react";
import {
  FlatList,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { commonStyles, COLORS } from "../../styles/lender.styles";
import { LenderHeader } from "../../components/lender";
import { RecentTransactionsService } from "../../services/lender.service";



export default function CollectionHistoryScreen({ navigation }: any) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCollected, setTotalCollected] = useState(0);
  const [overdue, setOverdue] = useState(0);
  const [filter, setFilter] = useState<"all" | "paid" | "partial" | "overdue">(
    "all",
  );

  useEffect(() => {
    (async () => {
      try {
        const data = await RecentTransactionsService.getTransactions({
          pageSize: 100,
        });
        const txns: any[] = data?.transactions ?? [];
        setHistory(txns);
        // Use the summary object the API already computes
        setTotalCollected(data?.summary?.totalCollected ?? 0);
        setOverdue(data?.summary?.overdueInstallments ?? 0);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered =
    filter === "all"
      ? history
      : history.filter((t: any) => {
          const s = (
            t.installmentSummary?.latestInstallmentStatus ??
            t.status ??
            ""
          ).toLowerCase();
          return s === filter;
        });

  const getStatusIcon = (item: any) => {
    const s = (
      item.installmentSummary?.latestInstallmentStatus ??
      item.loanStatus ??
      "active"
    ).toLowerCase();
    if (s === "paid")
      return { icon: "check-circle", bg: "#ECFDF5", color: COLORS.success };
    if (s === "overdue")
      return { icon: "alert-circle", bg: "#FEF2F2", color: COLORS.danger };
    if (s === "partial")
      return { icon: "clock", bg: "#FFFBEB", color: COLORS.warning };
    return { icon: "activity", bg: "#EBF4FF", color: COLORS.primary };
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "--";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const renderItem = ({ item }: any) => {
    const { icon, bg, color } = getStatusIcon(item);
    const paidInstallments = item.installmentSummary?.paidInstallments ?? 0;
    const totalInstallments = item.installmentSummary?.totalInstallments ?? 0;

    return (
      <TouchableOpacity
        style={commonStyles.card}
        onPress={() =>
          navigation.navigate("LoanDetails", { loanId: item.loanId ?? item.id })
        }
        activeOpacity={0.8}
      >
        <View style={commonStyles.rowSpaceBetween}>
          <View style={commonStyles.row}>
            <View style={[styles.statusIcon, { backgroundColor: bg }]}>
              <Feather name={icon as any} size={20} color={color} />
            </View>
            <View>
              <Text style={commonStyles.textPrimary}>
                {item.borrowerName ?? "Unknown"}
              </Text>
              <Text style={commonStyles.textSecondary}>
                Loan #{(item.loanId ?? item.id ?? "").slice(-6)}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[commonStyles.textPrimary, { fontWeight: "700" }]}>
              LKR {Number(item.amount ?? 0).toLocaleString()}
            </Text>
            <Text style={commonStyles.textSecondary}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>

        {/* Installment progress bar */}
        {totalInstallments > 0 && (
          <View style={{ marginTop: 12 }}>
            <View style={commonStyles.rowSpaceBetween}>
              <Text style={commonStyles.textSecondary}>
                {paidInstallments}/{totalInstallments} installments paid
              </Text>
              {item.installmentSummary?.nextDueDate && (
                <Text style={commonStyles.textSecondary}>
                  Next: {formatDate(item.installmentSummary.nextDueDate)}
                </Text>
              )}
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round((paidInstallments / totalInstallments) * 100)}%`,
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Remaining amount */}
        {item.remainingAmount > 0 && (
          <Text style={[commonStyles.textSecondary, { marginTop: 8 }]}>
            Outstanding: LKR {Number(item.remainingAmount).toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="Collection History"
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
      <LenderHeader
        title="Collection History"
        onBackPress={() => navigation.goBack()}
      />

      {/* Summary card */}
      <View style={commonStyles.card}>
        <View style={commonStyles.rowSpaceBetween}>
          <View>
            <Text style={commonStyles.textSecondary}>Total Collected</Text>
            <Text style={styles.largeText}>
              LKR {totalCollected.toLocaleString()}
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.statsNumber}>{history.length}</Text>
            <Text style={commonStyles.textSecondary}>Loans</Text>
          </View>
          {overdue > 0 && (
            <View style={{ alignItems: "center" }}>
              <Text style={[styles.statsNumber, { color: COLORS.danger }]}>
                {overdue}
              </Text>
              <Text style={commonStyles.textSecondary}>Overdue</Text>
            </View>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filters}>
        {(["all", "paid", "partial", "overdue"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) =>
          item.transactionId ??
          item.loanId ??
          item.id ??
          Math.random().toString()
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>
              No {filter === "all" ? "" : filter} records found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  largeText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.success,
    marginTop: 4,
  },
  statsNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: { fontSize: 11, fontWeight: "600", color: COLORS.textSecondary },
  filterTextActive: { color: "#fff" },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  list: { paddingBottom: 32 },
  empty: {
    alignItems: "center",
    marginTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
