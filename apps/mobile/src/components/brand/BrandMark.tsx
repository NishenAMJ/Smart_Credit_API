import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { BORDER_RADIUS } from "../../constants/radius";

export function BrandMark() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>↗</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.large,
    backgroundColor: "#4B9CFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  icon: {
    color: COLORS.surface,
    fontSize: 32,
    fontWeight: "700",
  },
});
