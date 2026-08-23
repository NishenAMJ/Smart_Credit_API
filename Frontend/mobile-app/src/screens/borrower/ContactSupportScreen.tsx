/** @format */

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { BORDER_RADIUS } from "../../constants/borderRadius";
import type { BorrowerNavigation } from "../../types/navigation";

type ContactSupportScreenProps = {
  navigation: BorrowerNavigation;
};

type CategoryOption = {
  label: string;
  value: string;
};

type FieldErrors = Partial<Record<"category" | "subject" | "message", string>>;

const categoryOptions: CategoryOption[] = [
  { label: "Payment issue", value: "payment" },
  { label: "Loan application", value: "loan" },
  { label: "KYC verification", value: "kyc" },
  { label: "Account security", value: "security" },
  { label: "Technical issue", value: "technical" },
  { label: "General question", value: "general" },
  { label: "Dispute guidance", value: "dispute" },
];

const SUBJECT_LIMIT = 100;
const MESSAGE_LIMIT = 1000;

export default function ContactSupportScreen({
  navigation,
}: ContactSupportScreenProps) {
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const selectedCategoryLabel = useMemo(() => {
    const found = categoryOptions.find((item) => item.value === category);
    return found?.label ?? "Choose a category";
  }, [category]);

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};
    if (!category) nextErrors.category = "Choose the type of help you need.";
    if (!subject.trim()) nextErrors.subject = "Enter a short subject.";
    if (!message.trim()) {
      nextErrors.message =
        "Describe what happened and what you need help with.";
    } else if (message.trim().length < 15) {
      nextErrors.message = "Add a little more detail so we can help you.";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      Alert.alert(
        "Request sent",
        "Your support request has been received. We will respond as soon as possible.",
        [{ text: "Done", onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert(
        "Unable to send request",
        "Your details are still here. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={22} color={COLORS.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Feather name="headphones" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.introCopy}>
            <Text style={styles.introTitle}>Tell us what you need</Text>
            <Text style={styles.introText}>
              Include the relevant loan or payment details, but never send a
              password, PIN, or access token.
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                fieldErrors.category && styles.fieldInvalid,
              ]}
              onPress={() => setCategoryModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Choose support category"
            >
              <Text
                style={[styles.pickerText, !category && styles.placeholderText]}
              >
                {selectedCategoryLabel}
              </Text>
              <Feather name="chevron-down" size={18} color="#667085" />
            </TouchableOpacity>
            {fieldErrors.category ? (
              <Text style={styles.fieldError}>{fieldErrors.category}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Subject</Text>
              <Text style={styles.characterCount}>
                {subject.length}/{SUBJECT_LIMIT}
              </Text>
            </View>
            <TextInput
              style={[styles.input, fieldErrors.subject && styles.fieldInvalid]}
              placeholder="Briefly describe the issue"
              placeholderTextColor="#98A2B3"
              value={subject}
              onChangeText={(value) => {
                setSubject(value);
                clearFieldError("subject");
              }}
              maxLength={SUBJECT_LIMIT}
              returnKeyType="next"
            />
            {fieldErrors.subject ? (
              <Text style={styles.fieldError}>{fieldErrors.subject}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroupLast}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Message</Text>
              <Text style={styles.characterCount}>
                {message.length}/{MESSAGE_LIMIT}
              </Text>
            </View>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                fieldErrors.message && styles.fieldInvalid,
              ]}
              placeholder="What happened, and what would you like us to do?"
              placeholderTextColor="#98A2B3"
              value={message}
              onChangeText={(value) => {
                setMessage(value);
                clearFieldError("message");
              }}
              multiline
              maxLength={MESSAGE_LIMIT}
              textAlignVertical="top"
            />
            {fieldErrors.message ? (
              <Text style={styles.fieldError}>{fieldErrors.message}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={() => void handleSubmit()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Send support request"
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <>
                <Feather name="send" size={17} color={COLORS.surface} />
                <Text style={styles.submitText}>Send request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCategoryModalVisible(false)}
        >
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose a category</Text>
            {categoryOptions.map((item) => {
              const isSelected = item.value === category;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={styles.modalOption}
                  onPress={() => {
                    setCategory(item.value);
                    clearFieldError("category");
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      isSelected && styles.modalOptionTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {isSelected ? (
                    <Feather
                      name="check-circle"
                      size={18}
                      color={COLORS.primary}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
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
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  intro: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.lg,
  },
  introIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#E6F0F9",
  },
  introCopy: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  introTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  introText: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  formCard: {
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.large,
    backgroundColor: COLORS.surface,
  },
  fieldGroup: {
    marginBottom: SPACING.lg,
  },
  fieldGroupLast: {
    marginBottom: 0,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    marginBottom: SPACING.xs,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  characterCount: {
    marginBottom: SPACING.xs,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  pickerButton: {
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.surface,
  },
  pickerText: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  placeholderText: {
    color: "#98A2B3",
  },
  input: {
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  textArea: {
    minHeight: 132,
  },
  fieldInvalid: {
    borderColor: COLORS.error ?? "#DC2626",
  },
  fieldError: {
    marginTop: 5,
    color: COLORS.error ?? "#DC2626",
    fontSize: 12,
    lineHeight: 16,
  },
  submitButton: {
    minHeight: 50,
    marginTop: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.primary,
  },
  submitButtonDisabled: {
    opacity: 0.62,
  },
  submitText: {
    color: COLORS.surface,
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  modalSheet: {
    maxHeight: "76%",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: COLORS.surface,
  },
  modalHandle: {
    width: 38,
    height: 4,
    alignSelf: "center",
    marginBottom: SPACING.md,
    borderRadius: 2,
    backgroundColor: "#D0D5DD",
  },
  modalTitle: {
    marginBottom: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  modalOption: {
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
  modalOptionTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
