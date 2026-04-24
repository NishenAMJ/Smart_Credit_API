import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { BrandMark } from "../../components/brand/BrandMark";
import { BrandTitle } from "../../components/brand/BrandTitle";
import { ErrorText } from "../../components/feedback/ErrorText";
import { OtpInput } from "../../components/form/OtpInput";
import { PrimaryButton } from "../../components/form/PrimaryButton";
import { TextLink } from "../../components/form/TextLink";
import { AuthScreenShell } from "../../components/layout/AuthScreenShell";
import { TopBlueHeader } from "../../components/layout/TopBlueHeader";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";

type OtpVerificationScreenProps = {
  purpose?: "login" | "register";
  contact?: string;
  onVerifySuccess?: (otpCode: string) => void;
  onResendCode?: () => void;
  onBackToLogin?: () => void;
};

export function OtpVerificationScreen({
  purpose = "login",
  contact,
  onVerifySuccess,
  onResendCode,
  onBackToLogin,
}: OtpVerificationScreenProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const heading = purpose === "register" ? "Verify Account" : "Verify Login";
  const helperCopy = useMemo(() => {
    const target = contact ?? "your mobile number or email";
    return `Enter the 6-digit code sent to ${target}`;
  }, [contact]);

  const handleVerify = () => {
    if (otp.length !== 6) {
      setError("Please enter the full 6-digit OTP.");
      return;
    }

    setError("");
    if (onVerifySuccess) {
      onVerifySuccess(otp);
      return;
    }

    Alert.alert("OTP Verified", "OTP verification flow will continue here.");
  };

  return (
    <AuthScreenShell
      header={<TopBlueHeader title="OTP Verification" subtitle={heading} />}
    >
      <View style={styles.container}>
        <View style={styles.brandSection}>
          <BrandMark />
          <BrandTitle title="Smart Credit+" subtitle={helperCopy} />
        </View>

        <View style={styles.formSection}>
          <OtpInput value={otp} onChange={setOtp} />
          <ErrorText message={error} />

          <PrimaryButton title="Verify OTP" onPress={handleVerify} />

          <View style={styles.actions}>
            <TextLink
              text="Resend Code"
              onPress={onResendCode}
            />
            <TextLink text="Back to Login" onPress={onBackToLogin} />
          </View>
        </View>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 42,
    paddingBottom: SPACING.xxl,
    justifyContent: "space-between",
  },
  brandSection: {
    alignItems: "center",
    gap: SPACING.lg,
    paddingTop: 28,
  },
  formSection: {
    gap: SPACING.lg,
    paddingBottom: 48,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
