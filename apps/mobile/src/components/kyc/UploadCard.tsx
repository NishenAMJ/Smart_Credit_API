import { Image, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { BORDER_RADIUS } from "../../constants/radius";
import { SPACING } from "../../constants/spacing";
import { UploadButton } from "./UploadButton";

type UploadCardProps = {
  title: string;
  selectedLabel?: string;
  previewUri?: string;
  onUpload?: () => void;
};

export function UploadCard({
  title,
  selectedLabel,
  previewUri,
  onUpload,
}: UploadCardProps) {
  return (
    <View style={styles.card}>
      {previewUri ? <Image source={{ uri: previewUri }} style={styles.preview} /> : null}
      <Text style={styles.title}>{selectedLabel ?? title}</Text>
      <UploadButton onPress={onUpload} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: BORDER_RADIUS.large,
    minHeight: 84,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  title: {
    color: "#8891A5",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  preview: {
    width: 84,
    height: 84,
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: SPACING.xs,
  },
});
