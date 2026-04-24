import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BrandMark } from "../../components/brand/BrandMark";
import { BrandTitle } from "../../components/brand/BrandTitle";
import { CheckboxField } from "../../components/form/CheckboxField";
import { AppInput } from "../../components/form/AppInput";
import { PasswordInput } from "../../components/form/PasswordInput";
import { PrimaryButton } from "../../components/form/PrimaryButton";
import { TextLink } from "../../components/form/TextLink";
import { AuthScreenShell } from "../../components/layout/AuthScreenShell";
import { TopBlueHeader } from "../../components/layout/TopBlueHeader";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";

type LoginScreenProps = {
  onNavigateToRegister?: () => void;
  onSubmit?: (payload: { identifier: string; password: string }) => void;
};

export function LoginScreen({
  onNavigateToRegister,
  onSubmit,
}: LoginScreenProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{
    identifier?: string;
    password?: string;
  }>({});

  const handleLogin = () => {
    const nextErrors: {
      identifier?: string;
      password?: string;
    } = {};

    if (!identifier.trim()) {
      nextErrors.identifier = "Email or phone number is required.";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSubmit?.({ identifier, password });
  };

  return (
    <AuthScreenShell
      header={
        <TopBlueHeader
          title="Login"
          subtitle="Access your borrower or lender account"
        />
      }
    >
      <View style={styles.container}>
        <View style={styles.brandSection}>
          <BrandMark />
          <BrandTitle />
        </View>

        <View style={styles.formSection}>
          <AppInput
            placeholder="Email or phone number"
            autoCapitalize="none"
            keyboardType="email-address"
            value={identifier}
            onChangeText={setIdentifier}
            error={errors.identifier}
          />

          <PasswordInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />

          <View style={styles.metaRow}>
            <CheckboxField
              label="Remember me"
              value={rememberMe}
              onChange={setRememberMe}
            />
            <TextLink
              text="Forgot Password ?"
              onPress={() => undefined}
            />
          </View>

          <PrimaryButton title="Log In" onPress={handleLogin} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TextLink
              text="Sign Up"
              onPress={onNavigateToRegister}
            />
          </View>
        </View>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 42,
    paddingBottom: SPACING.xxl,
    justifyContent: "space-between",
  },
  brandSection: {
    alignItems: "center",
    gap: SPACING.lg,
    paddingTop: 24,
  },
  formSection: {
    gap: SPACING.lg,
    paddingBottom: 40,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
