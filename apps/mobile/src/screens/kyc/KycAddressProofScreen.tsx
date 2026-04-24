import { StyleSheet, Text, View } from "react-native";

import { AppInput } from "../../components/form/AppInput";
import { PrimaryButton } from "../../components/form/PrimaryButton";
import { UploadCard } from "../../components/kyc/UploadCard";
import { KycStepIndicator } from "../../components/kyc/KycStepIndicator";
import { FormCard } from "../../components/layout/FormCard";
import { KycScreenShell } from "../../components/layout/KycScreenShell";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";

type KycAddressProofScreenProps = {
  documentNumber: string;
  addressProofFileName?: string;
  onChangeDocumentNumber: (value: string) => void;
  onUploadAddressProof?: () => void;
  onNext?: () => void;
};

export function KycAddressProofScreen({
  documentNumber,
  addressProofFileName,
  onChangeDocumentNumber,
  onUploadAddressProof,
  onNext,
}: KycAddressProofScreenProps) {
  return (
    <KycScreenShell stepIndicator={<KycStepIndicator currentStep={3} />}>
      <FormCard>
        <View style={styles.content}>
          <Text style={styles.title}>Add a document to verify your address</Text>

          <AppInput
            label="Document number"
            value={documentNumber}
            onChangeText={onChangeDocumentNumber}
          />

          <UploadCard
            title="Upload your address proof"
            selectedLabel={addressProofFileName}
            onUpload={onUploadAddressProof}
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
  title: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
});
