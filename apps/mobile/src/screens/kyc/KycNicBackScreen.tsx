import { StyleSheet, Text, View } from "react-native";

import { CheckboxField } from "../../components/form/CheckboxField";
import { PrimaryButton } from "../../components/form/PrimaryButton";
import { HelperText } from "../../components/feedback/HelperText";
import { UploadCard } from "../../components/kyc/UploadCard";
import { KycStepIndicator } from "../../components/kyc/KycStepIndicator";
import { FormCard } from "../../components/layout/FormCard";
import { KycScreenShell } from "../../components/layout/KycScreenShell";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";

type KycNicBackScreenProps = {
  acceptedDeclaration: boolean;
  nicBackFileName?: string;
  nicBackPreviewUri?: string;
  onChangeAcceptedDeclaration: (value: boolean) => void;
  onUploadBack?: () => void;
  onNext?: () => void;
};

export function KycNicBackScreen({
  acceptedDeclaration,
  nicBackFileName,
  nicBackPreviewUri,
  onChangeAcceptedDeclaration,
  onUploadBack,
  onNext,
}: KycNicBackScreenProps) {
  return (
    <KycScreenShell stepIndicator={<KycStepIndicator currentStep={2} />}>
      <FormCard>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>NIC (Back)</Text>
            <HelperText text="Please upload your National Identity Card below for completing your first step of KYC." />
          </View>

          <UploadCard
            title="Upload your NIC back photo"
            selectedLabel={nicBackFileName}
            previewUri={nicBackPreviewUri}
            onUpload={onUploadBack}
          />

          <CheckboxField
            label="I hereby agree that the above document belongs to me and voluntarily give my consent to complete KYC."
            value={acceptedDeclaration}
            onChange={onChangeAcceptedDeclaration}
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
