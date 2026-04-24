import { StyleSheet, View } from "react-native";

import { PrimaryButton } from "../../components/form/PrimaryButton";
import { SuccessState } from "../../components/kyc/SuccessState";
import { COLORS } from "../../constants/colors";

type KycSuccessScreenProps = {
  buttonTitle?: string;
  onBackHome?: () => void;
};

export function KycSuccessScreen({
  buttonTitle = "Back to home",
  onBackHome,
}: KycSuccessScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <SuccessState
          title="KYC Completed"
          message="Thanks for submitting your document we'll verify it and complete your KYC as soon as possible."
        />
        <PrimaryButton title={buttonTitle} onPress={onBackHome} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  content: {
    gap: 28,
  },
});
