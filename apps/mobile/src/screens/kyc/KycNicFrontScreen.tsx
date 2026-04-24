import { StyleSheet, Text, View } from "react-native";

import { AppInput } from "../../components/form/AppInput";
import { PrimaryButton } from "../../components/form/PrimaryButton";
import { HelperText } from "../../components/feedback/HelperText";
import { UploadCard } from "../../components/kyc/UploadCard";
import { KycStepIndicator } from "../../components/kyc/KycStepIndicator";
import { FormCard } from "../../components/layout/FormCard";
import { KycScreenShell } from "../../components/layout/KycScreenShell";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";

type KycNicFrontScreenProps = {
  nicNumber: string;
  nicFrontFileName?: string;
  nicFrontPreviewUri?: string;
  onChangeNicNumber: (value: string) => void;
  onUploadFront?: () => void;
  onNext?: () => void;
};

export function KycNicFrontScreen({
  nicNumber,
  nicFrontFileName,
  nicFrontPreviewUri,
  onChangeNicNumber,
  onUploadFront,
  onNext,
}: KycNicFrontScreenProps) {
  return (
    <KycScreenShell stepIndicator={<KycStepIndicator currentStep={1} />}>
      <FormCard>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>NIC (Front)</Text>
            <HelperText text="Please upload your National Identity card below for completing your first step of KYC" />
          </View>

          <AppInput
            label="NIC Number"
            value={nicNumber}
            onChangeText={onChangeNicNumber}
            placeholder=""
          />

          <UploadCard
            title="Upload NIC front photo"
            selectedLabel={nicFrontFileName}
            previewUri={nicFrontPreviewUri}
            onUpload={onUploadFront}
          />

          <PrimaryButton title="Submit" onPress={onNext} />
        </View>
      </FormCard>
    </KycScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: SPACING.xl,
  },
  header: {
    gap: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
});
