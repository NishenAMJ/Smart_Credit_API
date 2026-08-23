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
  type HelpCategory,
} from "../../constants/supportContent";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { BORDER_RADIUS } from "../../constants/borderRadius";
import type { BorrowerNavigation } from "../../types/navigation";

type HelpCenterScreenProps = {
  navigation: BorrowerNavigation;
};

export default function HelpCenterScreen({
  navigation,
}: HelpCenterScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "All" | HelpCategory
  >("All");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return helpCenterFaqs.filter((faq) => {
      const categoryMatches =
        selectedCategory === "All" || faq.category === selectedCategory;
      const searchMatches =
        !normalizedQuery ||
        faq.question.toLowerCase().includes(normalizedQuery) ||
        faq.answer.toLowerCase().includes(normalizedQuery);
      return categoryMatches && searchMatches;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={22} color={COLORS.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Find an answer</Text>
          <Text style={styles.introText}>
            Search borrower guidance for loans, payments, and your account.
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <Feather name="search" size={19} color="#667085" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search help topics"
            placeholderTextColor="#98A2B3"
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Feather name="x" size={18} color="#667085" />
            </TouchableOpacity>
          ) : null}
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
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
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

        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>Frequently asked questions</Text>
          <Text style={styles.resultCount}>{filteredFaqs.length}</Text>
        </View>

        {filteredFaqs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="search" size={24} color="#667085" />
            </View>
            <Text style={styles.emptyStateTitle}>No matching answer</Text>
            <Text style={styles.emptyStateText}>
              Try a different keyword or send the support team a message.
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => navigation.navigate("ContactSupport")}
            >
              <Text style={styles.emptyActionText}>Contact support</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.faqList}>
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <TouchableOpacity
                  key={faq.id}
                  style={[styles.faqItem, isExpanded && styles.faqItemExpanded]}
                  onPress={() =>
                    setExpandedFaqId((current) =>
                      current === faq.id ? null : faq.id,
                    )
                  }
                  activeOpacity={0.84}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                >
                  <View style={styles.faqHeader}>
                    <View style={styles.faqHeaderCopy}>
                      <Text style={styles.faqCategory}>{faq.category}</Text>
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                    </View>
                    <View style={styles.chevronWrap}>
                      <Feather
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#667085"
                      />
                    </View>
                  </View>
                  {isExpanded ? (
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.contactCard}>
          <View style={styles.contactIcon}>
            <Feather name="message-square" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.contactCopy}>
            <Text style={styles.contactTitle}>Still need help?</Text>
            <Text style={styles.contactText}>
              Send the support team the details of your issue.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => navigation.navigate("ContactSupport")}
            accessibilityRole="button"
            accessibilityLabel="Contact support"
          >
            <Feather name="arrow-right" size={18} color={COLORS.surface} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    minHeight: 107,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  headerTitle: {
    marginLeft: SPACING.xs,
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  intro: {
    marginBottom: SPACING.lg,
  },
  introTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  introText: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  searchContainer: {
    minHeight: 50,
    paddingLeft: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.surface,
  },
  searchInput: {
    minHeight: 48,
    flex: 1,
    paddingHorizontal: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  clearButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    paddingRight: SPACING.sm,
    gap: SPACING.sm,
  },
  categoryChip: {
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  categoryChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: COLORS.surface,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  resultTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  resultCount: {
    minWidth: 26,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: "hidden",
    borderRadius: 13,
    backgroundColor: "#E7EEF5",
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  faqList: {
    gap: SPACING.sm,
  },
  faqItem: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.surface,
  },
  faqItemExpanded: {
    borderColor: "#B8CCE0",
    backgroundColor: "#FBFCFE",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  faqHeaderCopy: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  faqCategory: {
    marginBottom: 4,
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  faqQuestion: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  chevronWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#F2F4F7",
  },
  faqAnswer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.large,
    backgroundColor: COLORS.surface,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#F2F4F7",
  },
  emptyStateTitle: {
    marginTop: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  emptyStateText: {
    marginTop: 5,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  emptyAction: {
    minHeight: 44,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: "#E7EEF5",
  },
  emptyActionText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  contactCard: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BORDER_RADIUS.large,
    backgroundColor: "#EAF0F5",
  },
  contactIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: COLORS.surface,
  },
  contactCopy: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  contactTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  contactText: {
    marginTop: 3,
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  contactButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: COLORS.primary,
  },
});
