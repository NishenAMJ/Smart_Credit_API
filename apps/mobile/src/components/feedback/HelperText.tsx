import { StyleSheet, Text } from "react-native";

import { COLORS } from "../../constants/colors";

type HelperTextProps = {
  text: string;
};

export function HelperText({ text }: HelperTextProps) {
  return <Text style={styles.text}>{text}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
});
