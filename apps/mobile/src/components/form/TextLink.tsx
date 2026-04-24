import { Pressable, StyleSheet, Text } from "react-native";

import { COLORS } from "../../constants/colors";

type TextLinkProps = {
  text: string;
  onPress?: () => void;
};

export function TextLink({ text, onPress }: TextLinkProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Text style={styles.text}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "500",
  },
});
