import { StyleSheet, Text } from "react-native";

type ErrorTextProps = {
  message?: string;
};

export function ErrorText({ message }: ErrorTextProps) {
  if (!message) {
    return null;
  }

  return <Text style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
  },
});
