/** @format */

import React, { useMemo, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { useAuth } from "../../context/AuthContext";
import type { AuthMode, MobileRole, SubmitKycPayload } from "../../types/auth";

type LoginForm = {
  identifier: string;
  password: string;
};

type RegisterForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  kyc: SubmitKycPayload;
  acceptedTerms: boolean;
};

type RegisterStep = "account" | "kyc";
type UploadFieldKey =
  | "documentFrontUrl"
  | "documentBackUrl"
  | "selfieUrl"
  | "profilePictureUrl";

const initialLoginForm: LoginForm = {
  identifier: "",
  password: "",
};

const initialRegisterForm: RegisterForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  acceptedTerms: false,
  kyc: {
    documentType: "national_id",
    documentNumber: "",
    fullName: "",
    issuingCountry: "Sri Lanka",
    expiryDate: "",
    documentFrontUrl: "",
    documentBackUrl: "",
    selfieUrl: "",
    profilePictureUrl: "",
  },
};

function getDocumentLabel(documentType: SubmitKycPayload["documentType"]) {
  switch (documentType) {
    case "passport":
      return "Passport";
    case "driving_license":
      return "License";
    default:
      return "NIC";
  }
}

async function convertFileUriToDataUrl(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () =>
      reject(new Error("We could not process the selected file."));
    reader.readAsDataURL(blob);
  });
}

export default function MobileAuthScreen() {
  const { authLoading, error, signIn, signUp } = useAuth();
  const [role, setRole] = useState<MobileRole>("borrower");
  const [mode, setMode] = useState<AuthMode>("login");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("account");
  const [loginForm, setLoginForm] = useState<LoginForm>(initialLoginForm);
  const [registerForm, setRegisterForm] = useState<RegisterForm>(initialRegisterForm);
  const [fieldError, setFieldError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Partial<Record<UploadFieldKey, string>>>(
    {},
  );
  const [uploadingField, setUploadingField] = useState<UploadFieldKey | null>(null);

  const isBorrower = role === "borrower";

  const heroContent = useMemo(
    () =>
      isBorrower
        ? {
            eyebrow: "Borrower mobile app",
            title: "Borrower sign in for your mobile workspace.",
            copy:
              "Create your account first, then complete KYC on a separate step before continuing into loans and repayments.",
          }
        : {
            eyebrow: "Lender mobile app",
            title: "Lender sign in for the shared mobile workspace.",
            copy:
              "Lenders can sign in here or create an account, then complete KYC in the second onboarding step.",
          },
    [isBorrower],
  );

  const modeSummary =
    mode === "login"
      ? "Use your email or phone together with your password."
      : registerStep === "account"
        ? "Start with your account details first."
        : "Finish the second step with your KYC details.";

  const documentNumberLabel =
    registerForm.kyc.documentType === "passport"
      ? "Passport number"
      : registerForm.kyc.documentType === "driving_license"
        ? "License number"
        : "NIC number";
  const documentLabel = getDocumentLabel(registerForm.kyc.documentType);
  const fullNameOnDocumentLabel = `Full name on ${documentLabel}`;

  function resetLocalState(nextMode?: AuthMode) {
    setFieldError("");
    if (nextMode) {
      setMode(nextMode);
      if (nextMode === "register") {
        setRegisterStep("account");
      }
    }
  }

  function switchRole(nextRole: MobileRole) {
    setRole(nextRole);
    setFieldError("");
    setMode("login");
    setRegisterStep("account");
    setSelectedFiles({});
  }

  async function handleSignIn() {
    if (!loginForm.identifier.trim() || !loginForm.password.trim()) {
      setFieldError("Please enter your email or phone together with your password.");
      return;
    }

    try {
      setFieldError("");
      await signIn({
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
        role,
      });
    } catch {
      return;
    }
  }

  function validateAccountStep() {
    if (!registerForm.fullName.trim()) {
      setFieldError("Full name is required.");
      return false;
    }

    if (!registerForm.email.trim() || !/\S+@\S+\.\S+/.test(registerForm.email.trim())) {
      setFieldError("Enter a valid email address.");
      return false;
    }

    if (!registerForm.phone.trim()) {
      setFieldError("Phone number is required.");
      return false;
    }

    if (registerForm.password.length < 8) {
      setFieldError("Password must be at least 8 characters long.");
      return false;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setFieldError("Passwords do not match.");
      return false;
    }

    return true;
  }

  function validateKycStep() {
    const currentDocumentLabel = getDocumentLabel(registerForm.kyc.documentType);

    if (!registerForm.kyc.documentNumber.trim() || !registerForm.kyc.fullName.trim()) {
      setFieldError(`Full name on the ID and ${currentDocumentLabel} number are required.`);
      return false;
    }

    if (!registerForm.kyc.documentFrontUrl?.trim() || !registerForm.kyc.selfieUrl?.trim()) {
      setFieldError(`${currentDocumentLabel} front file and selfie file are required for KYC.`);
      return false;
    }

    if (!registerForm.kyc.profilePictureUrl?.trim()) {
      setFieldError("Profile picture is required.");
      return false;
    }

    if (!registerForm.acceptedTerms) {
      setFieldError("Accept the terms before creating your account.");
      return false;
    }

    return true;
  }

  function handleContinueToKyc() {
    setFieldError("");
    if (!validateAccountStep()) {
      return;
    }

    setRegisterStep("kyc");
  }

  async function handlePickFile(
    field: UploadFieldKey,
    label: string,
    type: string | string[],
  ) {
    try {
      setFieldError("");
      setUploadingField(field);

      const result = await DocumentPicker.getDocumentAsync({
        type,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const dataUrl = await convertFileUriToDataUrl(asset.uri);

      setRegisterForm((current) => ({
        ...current,
        kyc: {
          ...current.kyc,
          [field]: dataUrl,
        },
      }));
      setSelectedFiles((current) => ({
        ...current,
        [field]: asset.name ?? `${label} selected`,
      }));
    } catch (pickError) {
      setFieldError(
        pickError instanceof Error
          ? pickError.message
          : `We could not upload the ${label.toLowerCase()} file.`,
      );
    } finally {
      setUploadingField(null);
    }
  }

  async function handleSignUp() {
    if (!validateAccountStep() || !validateKycStep()) {
      return;
    }

    try {
      setFieldError("");
      await signUp({
        account: {
          fullName: registerForm.fullName.trim(),
          email: registerForm.email.trim(),
          phone: registerForm.phone.trim(),
          password: registerForm.password,
          role,
        },
        kyc: {
          ...registerForm.kyc,
          documentNumber: registerForm.kyc.documentNumber.trim(),
          fullName: registerForm.kyc.fullName.trim(),
          issuingCountry: registerForm.kyc.issuingCountry?.trim(),
          documentFrontUrl: registerForm.kyc.documentFrontUrl?.trim(),
          documentBackUrl: registerForm.kyc.documentBackUrl?.trim(),
          selfieUrl: registerForm.kyc.selfieUrl?.trim(),
        },
      });

      Alert.alert(
        "Account created",
        "Your account was created and your KYC submission was sent for review.",
      );
      setRegisterForm(initialRegisterForm);
      setLoginForm({
        identifier: registerForm.email,
        password: "",
      });
      setMode("login");
      setRegisterStep("account");
      setSelectedFiles({});
    } catch {
      return;
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 24}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='interactive'
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroPanel}>
            <View style={styles.heroGlowLarge} />
            <View style={styles.heroGlowSmall} />
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>SC</Text>
              </View>
              <View style={styles.brandCopy}>
                <Text style={styles.brandTitle}>Smart Credit+</Text>
                <Text style={styles.brandSubtitle}>{heroContent.eyebrow}</Text>
              </View>
            </View>

            <View style={styles.roleToggleShell}>
              <Text style={styles.roleToggleLabel}>App mode</Text>
              <View style={styles.roleToggleRow}>
                <Pressable
                  onPress={() => switchRole("borrower")}
                  style={[
                    styles.roleToggleButton,
                    isBorrower && styles.roleToggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleToggleText,
                      isBorrower && styles.roleToggleTextActive,
                    ]}
                  >
                    Borrower
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => switchRole("lender")}
                  style={[
                    styles.roleToggleButton,
                    role === "lender" && styles.roleToggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleToggleText,
                      role === "lender" && styles.roleToggleTextActive,
                    ]}
                  >
                    Lender
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.heroTitle}>{heroContent.title}</Text>
            <Text style={styles.heroCopy}>{heroContent.copy}</Text>
          </View>

          <Card style={styles.authCard}>
            <View style={styles.formTopBand}>
              <View>
                <Text style={styles.formEyebrow}>
                  {mode === "login" ? "Welcome back" : "Onboarding"}
                </Text>
                <Text style={styles.formTitle}>
                  {mode === "login"
                    ? `${isBorrower ? "Borrower" : "Lender"} mobile sign in`
                    : registerStep === "account"
                      ? `${isBorrower ? "Borrower" : "Lender"} account setup`
                      : `${isBorrower ? "Borrower" : "Lender"} KYC verification`}
                </Text>
              </View>
              {mode === "register" ? (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    {registerStep === "account" ? "Step 1/2" : "Step 2/2"}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.modeRow}>
              <Pressable
                onPress={() => resetLocalState("login")}
                style={[styles.modeButton, mode === "login" && styles.modeButtonActive]}
              >
                <Text
                  style={[
                    styles.modeText,
                    mode === "login" && styles.modeTextActive,
                  ]}
                >
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                onPress={() => resetLocalState("register")}
                style={[
                  styles.modeButton,
                  mode === "register" && styles.modeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.modeText,
                    mode === "register" && styles.modeTextActive,
                  ]}
                >
                  Create Account
                </Text>
              </Pressable>
            </View>

            <Text style={styles.formSubtitle}>{modeSummary}</Text>

            {mode === "register" && registerStep === "account" ? (
              <View style={styles.noticeCard}>
                <Text style={styles.noticeTitle}>Two-step sign up</Text>
                <Text style={styles.noticeText}>
                  {isBorrower
                    ? "Create your borrower account first, then move to the KYC step."
                    : "Create your lender account first, then move to the KYC step."}
                </Text>
              </View>
            ) : null}

            {fieldError ? <Text style={styles.errorText}>{fieldError}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {mode === "login" ? (
              <View style={styles.formBody}>
                <View style={styles.formSectionCard}>
                  <FieldLabel label='Email or phone' />
                  <Input
                    value={loginForm.identifier}
                    onChangeText={(value) =>
                      setLoginForm((current) => ({ ...current, identifier: value }))
                    }
                    placeholder='name@example.com or +94 77 123 4567'
                    autoCapitalize='none'
                  />

                  <FieldLabel label='Password' />
                  <Input
                    value={loginForm.password}
                    onChangeText={(value) =>
                      setLoginForm((current) => ({ ...current, password: value }))
                    }
                    placeholder='Enter your password'
                    secureTextEntry
                  />
                </View>

                <Button onPress={() => void handleSignIn()} disabled={authLoading}>
                  {authLoading ? "Signing in..." : "Sign In"}
                </Button>

                <Text style={styles.footerHint}>
                  {isBorrower
                    ? "Borrowers sign in here before loan search, applications, and repayments."
                    : "Lenders can sign in here to continue into the mobile workspace."}
                </Text>
              </View>
            ) : (
              <View style={styles.formBody}>
                <View style={styles.progressRow}>
                  <ProgressStep label='Account' active={registerStep === "account"} complete={registerStep === "kyc"} />
                  <ProgressStep label='KYC' active={registerStep === "kyc"} />
                </View>
                {registerStep === "account" ? (
                  <>
                    <Text style={styles.sectionTitle}>Account details</Text>
                    <View style={styles.sectionBlock}>
                      <FieldLabel label='Full name' />
                      <Input
                        value={registerForm.fullName}
                        onChangeText={(value) =>
                          setRegisterForm((current) => ({
                            ...current,
                            fullName: value,
                            kyc: {
                              ...current.kyc,
                              fullName: current.kyc.fullName || value,
                            },
                          }))
                        }
                        placeholder='Kasun Perera'
                      />

                      <FieldLabel label='Email' />
                      <Input
                        value={registerForm.email}
                        onChangeText={(value) =>
                          setRegisterForm((current) => ({ ...current, email: value }))
                        }
                        placeholder='name@example.com'
                        autoCapitalize='none'
                      />

                      <FieldLabel label='Phone' />
                      <Input
                        value={registerForm.phone}
                        onChangeText={(value) =>
                          setRegisterForm((current) => ({ ...current, phone: value }))
                        }
                        placeholder='+94 77 123 4567'
                      />

                      <FieldLabel label='Password' />
                      <Input
                        value={registerForm.password}
                        onChangeText={(value) =>
                          setRegisterForm((current) => ({ ...current, password: value }))
                        }
                        placeholder='At least 8 characters'
                        secureTextEntry
                      />

                      <FieldLabel label='Confirm password' />
                      <Input
                        value={registerForm.confirmPassword}
                        onChangeText={(value) =>
                          setRegisterForm((current) => ({
                            ...current,
                            confirmPassword: value,
                          }))
                        }
                        placeholder='Repeat your password'
                        secureTextEntry
                      />
                    </View>

                    <Button onPress={handleContinueToKyc} disabled={authLoading}>
                      Continue to KYC
                    </Button>
                  </>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>KYC verification</Text>
                    <Text style={styles.sectionSubtitle}>
                      {isBorrower
                        ? "Finish this second step to verify your borrower account."
                        : "Finish this second step to verify your lender account."}
                    </Text>

                    <View style={styles.sectionBlock}>
                      <View style={styles.kycHighlightCard}>
                      <Text style={styles.kycHighlightTitle}>Verification details</Text>
                      <Text style={styles.kycHighlightText}>
                          Match the name on your ID and upload your {documentLabel} files before finishing account creation.
                      </Text>
                    </View>

                      <FieldLabel label='Document type' />
                      <View style={styles.docTypeRow}>
                        {[
                          { label: "National ID", value: "national_id" },
                          { label: "Passport", value: "passport" },
                          { label: "Driving License", value: "driving_license" },
                        ].map((option) => (
                          <Pressable
                            key={option.value}
                            onPress={() =>
                              setRegisterForm((current) => ({
                                ...current,
                                kyc: { ...current.kyc, documentType: option.value },
                              }))
                            }
                            style={[
                              styles.docTypeButton,
                              registerForm.kyc.documentType === option.value &&
                                styles.docTypeButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.docTypeText,
                                registerForm.kyc.documentType === option.value &&
                                  styles.docTypeTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      <FieldLabel label={documentNumberLabel} />
                      <Input
                        value={registerForm.kyc.documentNumber}
                        onChangeText={(value) =>
                          setRegisterForm((current) => ({
                            ...current,
                            kyc: { ...current.kyc, documentNumber: value },
                          }))
                        }
                        placeholder='Enter the number on your ID'
                      />

                    <FieldLabel label={fullNameOnDocumentLabel} />
                      <Input
                        value={registerForm.kyc.fullName}
                        onChangeText={(value) =>
                          setRegisterForm((current) => ({
                            ...current,
                            kyc: { ...current.kyc, fullName: value },
                          }))
                        }
                        placeholder={`As shown on your ${documentLabel}`}
                      />

                      <FieldLabel label='Issuing country' />
                      <Input
                        value={registerForm.kyc.issuingCountry}
                        onChangeText={(value) =>
                          setRegisterForm((current) => ({
                            ...current,
                            kyc: { ...current.kyc, issuingCountry: value },
                          }))
                        }
                        placeholder='Sri Lanka'
                      />

                      <FieldLabel label='Expiry date' />
                      <Input
                        value={registerForm.kyc.expiryDate}
                        onChangeText={(value) =>
                          setRegisterForm((current) => ({
                            ...current,
                            kyc: { ...current.kyc, expiryDate: value },
                          }))
                        }
                        placeholder='YYYY-MM-DD'
                      />

                      <Text style={styles.uploadHint}>
                        Choose files directly from your device for the required KYC uploads.
                      </Text>

                      <UploadPickerCard
                        label={`${documentLabel} front`}
                        fileName={selectedFiles.documentFrontUrl}
                        isUploading={uploadingField === "documentFrontUrl"}
                        onPress={() =>
                          void handlePickFile(
                            "documentFrontUrl",
                            `${documentLabel} front`,
                            ["image/*", "application/pdf"],
                          )
                        }
                      />

                      <UploadPickerCard
                        label={`${documentLabel} back`}
                        fileName={selectedFiles.documentBackUrl}
                        isUploading={uploadingField === "documentBackUrl"}
                        optional
                        onPress={() =>
                          void handlePickFile(
                            "documentBackUrl",
                            `${documentLabel} back`,
                            ["image/*", "application/pdf"],
                          )
                        }
                      />

                      <UploadPickerCard
                        label={`Selfie with ${documentLabel}`}
                        fileName={selectedFiles.selfieUrl}
                        isUploading={uploadingField === "selfieUrl"}
                        onPress={() =>
                          void handlePickFile("selfieUrl", `Selfie with ${documentLabel}`, "image/*")
                        }
                      />

                      <UploadPickerCard
                        label='Profile picture'
                        fileName={selectedFiles.profilePictureUrl}
                        isUploading={uploadingField === "profilePictureUrl"}
                        onPress={() =>
                          void handlePickFile("profilePictureUrl", "Profile picture", "image/*")
                        }
                      />
                    </View>

                    <View style={styles.termsRow}>
                      <Switch
                        value={registerForm.acceptedTerms}
                        onValueChange={(value) =>
                          setRegisterForm((current) => ({
                            ...current,
                            acceptedTerms: value,
                          }))
                        }
                        trackColor={{ false: "#dbe4ee", true: "#b6dbff" }}
                        thumbColor={registerForm.acceptedTerms ? COLORS.primary : "#ffffff"}
                      />
                      <Text style={styles.termsText}>
                        I agree to the platform terms and consent to identity verification.
                      </Text>
                    </View>

                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => setRegisterStep("account")}
                        disabled={authLoading}
                        style={[
                          styles.secondaryActionButton,
                          styles.actionButton,
                          authLoading && styles.secondaryActionButtonDisabled,
                        ]}
                      >
                        <Text style={styles.secondaryActionButtonText}>Back</Text>
                      </Pressable>
                      <Button
                        onPress={() => void handleSignUp()}
                        disabled={authLoading}
                        style={styles.actionButton}
                      >
                        {authLoading ? "Creating account..." : "Create account"}
                      </Button>
                    </View>
                  </>
                )}
              </View>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function UploadPickerCard({
  label,
  fileName,
  isUploading,
  optional = false,
  onPress,
}: {
  label: string;
  fileName?: string;
  isUploading: boolean;
  optional?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.uploadCard}>
      <View style={styles.uploadCardHeader}>
        <Text style={styles.uploadCardTitle}>
          {label}
          {optional ? " (Optional)" : ""}
        </Text>
        <Text style={styles.uploadCardAction}>
          {isUploading ? "Uploading..." : fileName ? "Change file" : "Choose file"}
        </Text>
      </View>
      {isUploading ? (
        <View style={styles.uploadCardStatus}>
          <ActivityIndicator size='small' color={COLORS.primary} />
          <Text style={styles.uploadCardFileName}>Preparing file...</Text>
        </View>
      ) : (
        <Text style={styles.uploadCardFileName}>
          {fileName ?? "No file selected yet"}
        </Text>
      )}
    </Pressable>
  );
}

function ProgressStep({
  label,
  active,
  complete = false,
}: {
  label: string;
  active: boolean;
  complete?: boolean;
}) {
  return (
    <View style={styles.progressStep}>
      <View
        style={[
          styles.progressDot,
          active && styles.progressDotActive,
          complete && styles.progressDotComplete,
        ]}
      />
      <Text
        style={[
          styles.progressLabel,
          active && styles.progressLabelActive,
          complete && styles.progressLabelComplete,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: SPACING.xxl + 120,
  },
  heroPanel: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    padding: SPACING.xxl,
    backgroundColor: "#081a32",
    gap: SPACING.lg,
  },
  heroGlowLarge: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(0,122,255,0.18)",
    top: -48,
    right: -36,
  },
  heroGlowSmall: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    bottom: 22,
    right: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  brandCopy: {
    flex: 1,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  brandMarkText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  brandSubtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "500",
  },
  roleToggleShell: {
    gap: SPACING.sm,
  },
  roleToggleLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  roleToggleRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  roleToggleButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  roleToggleButtonActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  roleToggleText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  roleToggleTextActive: {
    color: COLORS.textPrimary,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
  },
  heroCopy: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    lineHeight: 22,
  },
  authCard: {
    borderRadius: 24,
    padding: SPACING.xxl,
    gap: SPACING.lg,
  },
  formTopBand: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  formEyebrow: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#EFF6FF",
  },
  statusBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  modeRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    padding: 4,
    borderRadius: 999,
    backgroundColor: "#F4F7FB",
  },
  modeButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonActive: {
    backgroundColor: COLORS.surface,
  },
  modeText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  modeTextActive: {
    color: COLORS.primary,
  },
  formTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  formSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  noticeCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    backgroundColor: "#F7FAFE",
    borderWidth: 1,
    borderColor: "#E6EEF8",
    gap: SPACING.xs,
  },
  noticeTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  noticeText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: "#D92D20",
    fontSize: 14,
    fontWeight: "500",
  },
  formBody: {
    gap: SPACING.md,
  },
  formSectionCard: {
    borderRadius: 18,
    padding: SPACING.lg,
    backgroundColor: "#FBFCFE",
    borderWidth: 1,
    borderColor: "#EDF2F7",
    gap: SPACING.sm,
  },
  fieldLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
  sectionTitle: {
    marginTop: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  progressStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#D6DEE8",
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressDotComplete: {
    backgroundColor: COLORS.success,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  progressLabelActive: {
    color: COLORS.textPrimary,
  },
  progressLabelComplete: {
    color: COLORS.success,
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: -4,
    marginBottom: SPACING.xs,
  },
  sectionBlock: {
    gap: SPACING.md,
    borderRadius: 18,
    padding: SPACING.lg,
    backgroundColor: "#FBFCFE",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  docTypeRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
  docTypeButton: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  docTypeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#EAF4FF",
  },
  docTypeText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  docTypeTextActive: {
    color: COLORS.primary,
  },
  uploadHint: {
    color: COLORS.warning,
    fontSize: 13,
    lineHeight: 18,
  },
  kycHighlightCard: {
    borderRadius: 14,
    padding: SPACING.md,
    backgroundColor: "#EEF6FF",
    borderWidth: 1,
    borderColor: "#D8EAFE",
    marginBottom: SPACING.xs,
  },
  kycHighlightTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  kycHighlightText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  uploadCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE6F1",
    backgroundColor: "#FFFFFF",
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  uploadCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  uploadCardTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  uploadCardAction: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  uploadCardStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  uploadCardFileName: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  termsText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
  },
  secondaryActionButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8E2EE",
    backgroundColor: "#F8FAFD",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  secondaryActionButtonDisabled: {
    opacity: 0.6,
  },
  secondaryActionButtonText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  footerHint: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
