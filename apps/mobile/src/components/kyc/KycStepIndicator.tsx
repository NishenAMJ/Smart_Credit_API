import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";

type KycStepIndicatorProps = {
  currentStep: number;
};

const STEPS = [
  "NIC\nFront",
  "NIC\nBack",
  "Address\nProof",
  "Bank A/c\nDetails",
  "Profile\nPic",
] as const;

export function KycStepIndicator({ currentStep }: KycStepIndicatorProps) {
  return (
    <View style={styles.container}>
      {STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <View key={label} style={styles.stepColumn}>
            <View style={styles.stepRow}>
              <View
                style={[
                  styles.circle,
                  (isComplete || isCurrent) && styles.circleActive,
                ]}
              >
                <Text
                  style={[
                    styles.circleText,
                    (isComplete || isCurrent) && styles.circleTextActive,
                  ]}
                >
                  {isComplete ? "✓" : stepNumber}
                </Text>
              </View>
              {index < STEPS.length - 1 ? (
                <View
                  style={[
                    styles.line,
                    stepNumber < currentStep && styles.lineActive,
                  ]}
                />
              ) : null}
            </View>
            <Text style={styles.label}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepColumn: {
    flex: 1,
    alignItems: "center",
  },
  stepRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#D6DBE6",
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  circleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  circleText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  circleTextActive: {
    color: COLORS.surface,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#D6DBE6",
    marginHorizontal: 2,
  },
  lineActive: {
    backgroundColor: COLORS.primary,
  },
  label: {
    marginTop: SPACING.xs,
    color: COLORS.textSecondary,
    fontSize: 8,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 10,
  },
});
