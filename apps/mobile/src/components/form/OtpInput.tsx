import { useEffect, useRef } from "react";
import {
  StyleSheet,
  TextInput,
  type TextInput as TextInputType,
  View,
} from "react-native";

import { COLORS } from "../../constants/colors";
import { BORDER_RADIUS } from "../../constants/radius";
import { SPACING } from "../../constants/spacing";

type OtpInputProps = {
  value: string;
  length?: number;
  onChange: (value: string) => void;
};

export function OtpInput({
  value,
  length = 6,
  onChange,
}: OtpInputProps) {
  const inputRefs = useRef<Array<TextInputType | null>>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  useEffect(() => {
    if (value.length === length) {
      inputRefs.current[length - 1]?.blur();
    }
  }, [length, value]);

  const handleChange = (text: string, index: number) => {
    const nextChar = text.replace(/[^0-9]/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = nextChar;
    const nextValue = nextDigits.join("");
    onChange(nextValue);

    if (nextChar && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    key: string,
    index: number,
  ) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          style={styles.cell}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={({ nativeEvent }) =>
            handleKeyPress(nativeEvent.key, index)
          }
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          selectionColor={COLORS.primary}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  cell: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
});
