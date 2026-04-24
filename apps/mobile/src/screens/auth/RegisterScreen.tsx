import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppInput } from "../../components/form/AppInput";
import { CheckboxField } from "../../components/form/CheckboxField";
import { PasswordInput } from "../../components/form/PasswordInput";
import { PrimaryButton } from "../../components/form/PrimaryButton";
import { RoleSelector } from "../../components/form/RoleSelector";
import { TextLink } from "../../components/form/TextLink";
import { AuthScreenShell } from "../../components/layout/AuthScreenShell";
import { TopBlueHeader } from "../../components/layout/TopBlueHeader";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import type { UserRole } from "../../types/auth";

type RegisterScreenProps = {
  onNavigateToLogin?: () => void;
  onSubmit?: (payload: {
    role: UserRole;
    fullName: string;
    email: string;
    phoneNumber: string;
    nic: string;
    birthDate: string;
    password: string;
  }) => void;
};

export function RegisterScreen({
  onNavigateToLogin,
  onSubmit,
}: RegisterScreenProps) {
  const [role, setRole] = useState<UserRole>("borrower");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nic, setNic] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCreateAccount = () => {
    const nextErrors: Record<string, string> = {};

    if (!fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!email.trim()) nextErrors.email = "Email address is required.";
    if (!phoneNumber.trim()) nextErrors.phoneNumber = "Phone number is required.";
    if (!nic.trim()) nextErrors.nic = "NIC is required.";
    if (!birthDate.trim()) nextErrors.birthDate = "Birth date is required.";
    if (!password.trim()) nextErrors.password = "Password is required.";
    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (!acceptedTerms) {
      nextErrors.acceptedTerms = "You must accept the terms to continue.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSubmit?.({
      role,
      fullName,
      email,
      phoneNumber,
      nic,
      birthDate,
      password,
    });
  };

  return (
    <AuthScreenShell
      header={
        <TopBlueHeader
          title="Create Account"
          subtitle="Register as a borrower or lender"
        />
      }
    >
      <View style={styles.container}>
        <View style={styles.formSection}>
          <RoleSelector value={role} onChange={setRole} />

          <AppInput
            label="Full Name"
            placeholder="John Doe"
            value={fullName}
            onChangeText={setFullName}
            error={errors.fullName}
          />

          <AppInput
            label="Email Address"
            placeholder="john@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
          />

          <AppInput
            label="Phone Number"
            placeholder="+94 77 123 4567"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            error={errors.phoneNumber}
          />

          <AppInput
            label="NIC"
            placeholder="200012345678"
            value={nic}
            onChangeText={setNic}
            error={errors.nic}
          />

          <AppInput
            label="Birth of date"
            placeholder="18/03/2004"
            value={birthDate}
            onChangeText={setBirthDate}
            error={errors.birthDate}
          />

          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
          />

          <View>
            <CheckboxField
              label="I agree to the Terms & Conditions and Privacy Policy"
              value={acceptedTerms}
              onChange={setAcceptedTerms}
            />
            {errors.acceptedTerms ? (
              <Text style={styles.termsError}>{errors.acceptedTerms}</Text>
            ) : null}
          </View>

          <PrimaryButton title="Create Account" onPress={handleCreateAccount} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TextLink text="Log in" onPress={onNavigateToLogin} />
          </View>
        </View>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: SPACING.xxl,
  },
  formSection: {
    gap: SPACING.lg,
    paddingBottom: 32,
  },
  termsError: {
    marginTop: 6,
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "500",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
});
