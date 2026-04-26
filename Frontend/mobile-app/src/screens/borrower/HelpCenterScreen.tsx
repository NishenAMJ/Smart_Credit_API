/** @format */

import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  helpCenterCategories,
  helpCenterFaqs,
} from "../../constants/supportContent";
import type { BorrowerNavigation } from "../../types/navigation";

type HelpCenterScreenProps = {
  navigation: BorrowerNavigation;
};

/**
 * Shows borrower help center resources and support topics.
 */
export default function HelpCenterScreen({
  navigation,
}: HelpCenterScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "All" | "Borrower" | "Lender" | "Technical"
  >("All");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return helpCenterFaqs.filter((faq) => {
      const categoryMatch =
        selectedCategory === "All" || faq.category === selectedCategory;

      if (!categoryMatch) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        faq.question.toLowerCase().includes(normalizedQuery) ||
        faq.answer.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [searchQuery, selectedCategory]);

  const onToggleFaq = (faqId: string) => {
    setExpandedFaqId((current) => (current === faqId ? null : faqId));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help Center</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for help topics..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {helpCenterCategories.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  isActive && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.faqCard}>
          {filteredFaqs.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="help-circle" size={30} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No matching FAQ found</Text>
              <Text style={styles.emptyStateText}>
                Try another keyword or open Support chat for help.
              </Text>
            </View>
          ) : (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;

              return (
                <TouchableOpacity
                  key={faq.id}
                  style={styles.faqItem}
                  onPress={() => onToggleFaq(faq.id)}
                >
                  <View style={styles.faqHeader}>
                    <View style={styles.faqHeaderLeft}>
                      <Text style={styles.faqCategory}>{faq.category}</Text>
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                    </View>
                    <Feather
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#6B7280"
                    />
                  </View>

                  {isExpanded ? (
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="message-circle" size={16} color="#FFFFFF" />
          <Text style={styles.contactButtonText}>
            Still need help? Contact Support
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 26,
  },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  chipRow: {
    paddingVertical: 4,
    paddingRight: 6,
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: "#DBEAFE",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  categoryChipTextActive: {
    color: "#1D4ED8",
  },
  faqCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 12,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  faqCategory: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "700",
    marginBottom: 4,
  },
  faqQuestion: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    lineHeight: 19,
  },
  faqAnswer: {
    marginTop: 8,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 26,
  },
  emptyStateTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  emptyStateText: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  contactButton: {
    marginTop: 14,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  contactButtonText: {
    marginLeft: 6,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
