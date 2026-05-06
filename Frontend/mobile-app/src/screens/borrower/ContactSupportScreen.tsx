/** @format */

import React, { useMemo, useState } from "react";
import {
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
import type { BorrowerNavigation } from "../../types/navigation";

type ContactSupportScreenProps = {
  navigation: BorrowerNavigation;
  route?: {
    params?: {
      initialCategory?: string;
    };
  };
};

type CategoryOption = {
  label: string;
  value: string;
};

const categoryOptions: CategoryOption[] = [
  { label: "Payment Issue", value: "payment" },
  { label: "Loan Application Help", value: "loan" },
  { label: "KYC / Identity Verification", value: "kyc" },
  { label: "Account Security", value: "security" },
  { label: "Bug Report", value: "technical" },
  { label: "General Inquiry", value: "general" },
  { label: "Request a Call", value: "call_request" },
  { label: "Raise Dispute", value: "dispute" },
];

/**
 * Provides borrower contact channels for support requests.
 */
export default function ContactSupportScreen({
  navigation,
  route,
}: ContactSupportScreenProps) {
  const [category, setCategory] = useState(
    route?.params?.initialCategory ?? "",
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const selectedCategoryLabel = useMemo(() => {
    const found = categoryOptions.find((item) => item.value === category);
    return found?.label ?? "Select a category";
  }, [category]);

  const handleSubmit = async () => {
    if (!category || !subject.trim() || !message.trim()) {
      Alert.alert("Error", "Please fill in all fields before submitting.");
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      Alert.alert(
        "Success",
        "Your support ticket has been submitted. We will get back to you soon.",
      );
      setSubject("");
      setMessage("");
      setCategory("");
      navigation.goBack();
    } catch {
      Alert.alert(
        "Submission Failed",
        "Something went wrong. Please try again.",
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
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Support</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subHeader}>How can we help you today?</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Select Category</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Text
              style={[styles.pickerText, !category && styles.placeholderText]}
            >
              {selectedCategoryLabel}
            </Text>
            <Feather name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>

          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g., Unable to scan QR code"
            placeholderTextColor="#9CA3AF"
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={styles.label}>Describe your issue</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide as much detail as possible..."
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitText}>
              {loading ? "Submitting..." : "Send Message"}
            </Text>
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
          <View style={styles.modalSheet}>
            {categoryOptions.map((item) => {
              const isSelected = item.value === category;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={styles.modalOption}
                  onPress={() => {
                    setCategory(item.value);
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
                    <Feather name="check" size={16} color={COLORS.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
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
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
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
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  subHeader: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  form: {
    marginTop: SPACING.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 130,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  submitButtonDisabled: {
    backgroundColor: "#93C5FD",
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.32)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    maxHeight: "70%",
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  modalOptionTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
