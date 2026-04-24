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

type KycBankDetailsScreenProps = {
  accountNumber: string;
  confirmAccountNumber: string;
  bankName: string;
  branchCode: string;
  accountType: string;
  bankDocumentFileName?: string;
  onChangeAccountNumber: (value: string) => void;
  onChangeConfirmAccountNumber: (value: string) => void;
  onChangeBankName: (value: string) => void;
  onChangeBranchCode: (value: string) => void;
  onChangeAccountType: (value: string) => void;
  onUploadBankDocument?: () => void;
  onNext?: () => void;
};

export function KycBankDetailsScreen({
  accountNumber,
  confirmAccountNumber,
  bankName,
  branchCode,
  accountType,
  bankDocumentFileName,
  onChangeAccountNumber,
  onChangeConfirmAccountNumber,
  onChangeBankName,
  onChangeBranchCode,
  onChangeAccountType,
  onUploadBankDocument,
  onNext,
}: KycBankDetailsScreenProps) {
  return (
    <KycScreenShell stepIndicator={<KycStepIndicator currentStep={4} />}>
      <FormCard>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Bank Account</Text>
            <HelperText text="Please enter your bank account details" />
          </View>

          <AppInput
            label="Account Number"
            value={accountNumber}
            onChangeText={onChangeAccountNumber}
          />
          <AppInput
            label="Confirm Account Number"
            value={confirmAccountNumber}
            onChangeText={onChangeConfirmAccountNumber}
          />
          <AppInput label="Bank Name" value={bankName} onChangeText={onChangeBankName} />
          <AppInput
            label="Branch Code"
            value={branchCode}
            onChangeText={onChangeBranchCode}
          />
          <AppInput
            label="Account type"
            value={accountType}
            onChangeText={onChangeAccountType}
          />

          <UploadCard
            title="Upload your any bank document"
            selectedLabel={bankDocumentFileName}
            onUpload={onUploadBankDocument}
          />

          <PrimaryButton title="Submit" onPress={onNext} />
        </View>
      </FormCard>
    </KycScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: SPACING.lg,
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
