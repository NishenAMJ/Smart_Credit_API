/** @format */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, commonStyles } from "../../styles/lender.styles";

interface AlertBannerProps {
  type?: "error" | "warning" | "success" | "info";
  title: string;
  message?: string;
  icon?: string;
}

export default function AlertBanner({
  type = "warning",
  title,
  message,
  icon,
}: AlertBannerProps) {
  const getColors = () => {
    switch (type) {
      case "error":
        return {
          bg: "#FEF2F2",
          text: "#991B1B",
          border: COLORS.danger,
          icon: "alert-circle",
        };
      case "success":
        return {
          bg: "#ECFDF5",
          text: "#065F46",
          border: COLORS.success,
          icon: "check-circle",
        };
      case "info":
        return {
          bg: "#EBF4FF",
          text: "#1E40AF",
          border: COLORS.primary,
          icon: "info",
        };
      default:
        return {
          bg: "#FFFBEB",
          text: "#92400E",
          border: COLORS.warning,
          icon: "alert-triangle",
        };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.bg, borderLeftColor: colors.border },
      ]}
    >
      <Feather
        name={icon || (colors.icon as any)}
        size={18}
        color={colors.border}
      />
      <View style={styles.content}>
        <Text
          style={[
            commonStyles.textPrimary,
            styles.title,
            { color: colors.text },
          ]}
        >
          {title}
        </Text>
        {message && (
          <Text
            style={[
              commonStyles.textSmall,
              styles.message,
              { color: colors.text },
            ]}
          >
            {message}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
  },

  content: {
    flex: 1,
  },

  title: {
    marginBottom: 2,
  },

  message: {
    lineHeight: 18,
  },
});
