import { Pressable, StyleSheet, Text } from "react-native";

import { COLORS } from "../../constants/colors";
import { BORDER_RADIUS } from "../../constants/radius";

type UploadButtonProps = {
  onPress?: () => void;
  title?: string;
};

export function UploadButton({
  onPress,
  title = "Upload +",
}: UploadButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 88,
    height: 28,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: "#D9DEE8",
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    paddingHorizontal: 12,
  },
  text: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "600",
  },
});
