import { useState } from "react";
import { Alert } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { DashboardScreen } from "../screens/home/DashboardScreen";
import type { RegisterPayload, VerifiedRegistrationPayload } from "../types/auth";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { OtpVerificationScreen } from "../screens/auth/OtpVerificationScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { authApi } from "../services/auth/auth.api";
import { session } from "../services/auth/session";
import type { AuthStackParamList } from "./types";
import { KycNavigator } from "./KycNavigator";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const [pendingRegistration, setPendingRegistration] = useState<{
    raw: RegisterPayload;
    otpSessionId: string;
    verified?: VerifiedRegistrationPayload;
  } | null>(null);
  const [pendingLoginOtpSessionId, setPendingLoginOtpSessionId] = useState<
    string | null
  >(null);

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onNavigateToRegister={() => navigation.navigate("Register")}
            onSubmit={async ({ identifier, password }) => {
              try {
                const response = await authApi.login({ identifier, password });
                setPendingLoginOtpSessionId(response.otpSessionId ?? null);
                navigation.navigate("OtpVerification", {
                  purpose: "login",
                  contact: response.contact,
                });
              } catch (error) {
                Alert.alert(
                  "Login failed",
                  error instanceof Error ? error.message : "Please try again.",
                );
              }
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Register">
        {({ navigation }) => (
          <RegisterScreen
            onNavigateToLogin={() => navigation.goBack()}
            onSubmit={async (payload) => {
              try {
                const response = await authApi.register(payload);
                if (!response.otpSessionId) {
                  throw new Error("OTP session was not created.");
                }

                setPendingRegistration({
                  raw: payload,
                  otpSessionId: response.otpSessionId,
                });
                navigation.navigate("OtpVerification", {
                  purpose: "register",
                  contact: response.contact,
                });
              } catch (error) {
                Alert.alert(
                  "Registration failed",
                  error instanceof Error ? error.message : "Please try again.",
                );
              }
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="OtpVerification">
        {({ navigation, route }) => (
          <OtpVerificationScreen
            purpose={route.params.purpose}
            contact={route.params.contact}
            onBackToLogin={() => navigation.popToTop()}
            onVerifySuccess={async (otpCode) => {
              if (route.params.purpose === "register") {
                if (!pendingRegistration?.otpSessionId) {
                  Alert.alert(
                    "Registration missing",
                    "Please fill out the registration form again.",
                  );
                  navigation.replace("Register");
                  return;
                }
                const verifyResponse = await authApi.verifyOtp({
                  otpCode,
                  otpSessionId: pendingRegistration.otpSessionId,
                  purpose: "register",
                });

                if (!verifyResponse.registrationPayload) {
                  Alert.alert(
                    "OTP verification failed",
                    "No registration payload was returned by the backend.",
                  );
                  return;
                }

                setPendingRegistration((current) =>
                  current
                    ? { ...current, verified: verifyResponse.registrationPayload }
                    : current,
                );
                navigation.replace("KycFlow");
                return;
              }

              if (!pendingLoginOtpSessionId) {
                Alert.alert(
                  "OTP session missing",
                  "Please try logging in again.",
                );
                return;
              }

              try {
                const verifyResponse = await authApi.verifyOtp({
                  otpCode,
                  otpSessionId: pendingLoginOtpSessionId,
                  purpose: "login",
                });

                if (!verifyResponse.userId) {
                  throw new Error("Login verification did not return a user.");
                }

                session.set({
                  accessToken: verifyResponse.accessToken,
                  userId: verifyResponse.userId,
                });
                setPendingLoginOtpSessionId(null);
                navigation.replace("Dashboard", { userId: verifyResponse.userId });
              } catch (error) {
                Alert.alert(
                  "OTP verification failed",
                  error instanceof Error ? error.message : "Please try again.",
                );
              }
            }}
            onResendCode={async () => {
              try {
                const otpSessionId =
                  route.params.purpose === "register"
                    ? pendingRegistration?.otpSessionId
                    : pendingLoginOtpSessionId;

                if (!otpSessionId) {
                  throw new Error("OTP session was not found.");
                }

                const response = await authApi.resendOtp({ otpSessionId });

                if (route.params.purpose === "register") {
                  setPendingRegistration((current) =>
                    current && response.otpSessionId
                      ? { ...current, otpSessionId: response.otpSessionId }
                      : current,
                  );
                } else if (response.otpSessionId) {
                  setPendingLoginOtpSessionId(response.otpSessionId);
                }

                Alert.alert(
                  "OTP Sent",
                  `A new OTP was sent to ${response.contact}.`,
                );
              } catch (error) {
                Alert.alert(
                  "Resend failed",
                  error instanceof Error ? error.message : "Please try again.",
                );
              }
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="KycFlow">
        {({ navigation }) => (
          <KycNavigator
            registrationPayload={
              pendingRegistration?.verified ?? {
                role: "borrower",
                fullName: "",
                email: "",
                phoneNumber: "",
                nic: "",
                birthDate: "",
                passwordHash: "",
              }
            }
            onComplete={(userId) => {
              setPendingRegistration(null);
              navigation.replace("Dashboard", { userId });
              setTimeout(() => {
                Alert.alert(
                  "KYC Submitted",
                  "Registration data was saved to Firestore with pending KYC review.",
                );
              }, 0);
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Dashboard">
        {({ route }) => <DashboardScreen userId={route.params.userId} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
