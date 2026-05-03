/** @format */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, commonStyles } from "../../styles/lender.styles";

interface LenderHeaderProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  backgroundColor?: string;
  rightIcon?: string;
  onRightPress?: () => void;
}

export default function LenderHeader({
  title,
  subtitle,
  onBackPress,
  backgroundColor = COLORS.primary,
  rightIcon,
  onRightPress,
}: LenderHeaderProps) {
  return (
    <View style={[styles.header, { backgroundColor }]}>
      <View style={styles.headerContent}>
        {onBackPress && (
          <TouchableOpacity onPress={onBackPress} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.titleContainer}>
          <Text style={[commonStyles.headerTitle, styles.title]}>{title}</Text>
          {subtitle && (
            <Text style={[commonStyles.textSecondary, styles.subtitle]}>
              {subtitle}
            </Text>
          )}
        </View>

        {rightIcon ? (
          <TouchableOpacity onPress={onRightPress} style={styles.rightBtn}>
            <Feather name={rightIcon as any} size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
  },

  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  rightBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  titleContainer: {
    flex: 1,
    alignItems: "center",
  },

  title: {
    color: "#fff",
  },

  subtitle: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
});
