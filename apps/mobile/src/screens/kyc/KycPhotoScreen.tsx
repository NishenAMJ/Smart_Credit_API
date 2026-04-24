import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/form/PrimaryButton";
import { HelperText } from "../../components/feedback/HelperText";
import { UploadCard } from "../../components/kyc/UploadCard";
import { KycStepIndicator } from "../../components/kyc/KycStepIndicator";
import { FormCard } from "../../components/layout/FormCard";
import { KycScreenShell } from "../../components/layout/KycScreenShell";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";

type KycPhotoScreenProps = {
  photoFileName?: string;
  photoPreviewUri?: string;
  onUploadPhoto?: () => void;
  onNext?: () => void;
};

export function KycPhotoScreen({
  photoFileName,
  photoPreviewUri,
  onUploadPhoto,
  onNext,
}: KycPhotoScreenProps) {
  return (
    <KycScreenShell stepIndicator={<KycStepIndicator currentStep={5} />}>
      <FormCard>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Photo</Text>
            <HelperText text="Please Upload Your Photo" />
          </View>

          <UploadCard
            title="Upload your Photo"
            selectedLabel={photoFileName}
            previewUri={photoPreviewUri}
            onUpload={onUploadPhoto}
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
