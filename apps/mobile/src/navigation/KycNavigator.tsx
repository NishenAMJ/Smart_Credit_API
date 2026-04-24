import { useState } from "react";
import { Alert } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { VerifiedRegistrationPayload } from "../types/auth";
import { uploadFileToStorage } from "../services/firebase/storage";
import { kycApi } from "../services/kyc/kyc.api";
import { KycAddressProofScreen } from "../screens/kyc/KycAddressProofScreen";
import { KycBankDetailsScreen } from "../screens/kyc/KycBankDetailsScreen";
import { KycNicBackScreen } from "../screens/kyc/KycNicBackScreen";
import { KycNicFrontScreen } from "../screens/kyc/KycNicFrontScreen";
import { KycPhotoScreen } from "../screens/kyc/KycPhotoScreen";
import { KycSuccessScreen } from "../screens/kyc/KycSuccessScreen";
import type { PickedFile } from "../utils/pickers";
import { pickDocumentFile, pickImageFromLibrary } from "../utils/pickers";
import type { KycStackParamList } from "./types";

const Stack = createNativeStackNavigator<KycStackParamList>();

type KycNavigatorProps = {
  registrationPayload: VerifiedRegistrationPayload;
  onComplete?: (userId: string) => void;
};

export function KycNavigator({
  registrationPayload,
  onComplete,
}: KycNavigatorProps) {
  const [nicNumber, setNicNumber] = useState("");
  const [acceptedDeclaration, setAcceptedDeclaration] = useState(false);
  const [documentNumber, setDocumentNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [accountType, setAccountType] = useState("");
  const [nicFrontFile, setNicFrontFile] = useState<PickedFile | null>(null);
  const [nicBackFile, setNicBackFile] = useState<PickedFile | null>(null);
  const [addressProofFile, setAddressProofFile] = useState<PickedFile | null>(null);
  const [bankDocumentFile, setBankDocumentFile] = useState<PickedFile | null>(null);
  const [photoFile, setPhotoFile] = useState<PickedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handlePickImage(
    setter: (value: PickedFile | null) => void,
    folder: string,
  ) {
    const result = await pickImageFromLibrary();
    if (!result) return;

    const uploaded = await uploadFileToStorage(
      result,
      `kyc/${registrationPayload.role}/${folder}`,
    );
    setter(uploaded);
  }

  async function handlePickDocument(
    setter: (value: PickedFile | null) => void,
    folder: string,
  ) {
    const result = await pickDocumentFile();
    if (!result) return;

    const uploaded = await uploadFileToStorage(
      result,
      `kyc/${registrationPayload.role}/${folder}`,
    );
    setter(uploaded);
  }

  async function handleCompleteKyc() {
    if (!nicFrontFile?.downloadUrl || !nicBackFile?.downloadUrl) {
      Alert.alert("KYC", "Please upload both NIC images.");
      return;
    }
    if (!addressProofFile?.downloadUrl || !bankDocumentFile?.downloadUrl) {
      Alert.alert("KYC", "Please upload your address proof and bank document.");
      return;
    }
    if (!photoFile?.downloadUrl) {
      Alert.alert("KYC", "Please upload your profile photo.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await kycApi.submit({
        role: registrationPayload.role,
        fullName: registrationPayload.fullName,
        email: registrationPayload.email,
        phoneNumber: registrationPayload.phoneNumber,
        nic: registrationPayload.nic,
        birthDate: registrationPayload.birthDate,
        passwordHash: registrationPayload.passwordHash,
        nicFrontUrl: nicFrontFile.downloadUrl,
        nicBackUrl: nicBackFile.downloadUrl,
        addressProofNumber: documentNumber,
        addressProofUrl: addressProofFile.downloadUrl,
        bankAccountNumber: accountNumber,
        bankName,
        branchCode,
        accountType,
        bankDocumentUrl: bankDocumentFile.downloadUrl,
        profilePhotoUrl: photoFile.downloadUrl,
      });

      if (!response.userId) {
        throw new Error("KYC submission did not return a user ID.");
      }

      onComplete?.(response.userId);
    } catch (error) {
      Alert.alert(
        "KYC submission failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="KycNicFront">
        {({ navigation }) => (
          <KycNicFrontScreen
            nicNumber={nicNumber}
            nicFrontFileName={nicFrontFile?.name}
            nicFrontPreviewUri={nicFrontFile?.uri}
            onChangeNicNumber={setNicNumber}
            onUploadFront={() => handlePickImage(setNicFrontFile, "nic-front")}
            onNext={() => {
              if (!nicNumber.trim()) {
                Alert.alert("NIC Number", "Please enter your NIC number.");
                return;
              }
              if (!nicFrontFile) {
                Alert.alert("NIC Front", "Please upload the NIC front image.");
                return;
              }
              navigation.navigate("KycNicBack");
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="KycNicBack">
        {({ navigation }) => (
          <KycNicBackScreen
            acceptedDeclaration={acceptedDeclaration}
            nicBackFileName={nicBackFile?.name}
            nicBackPreviewUri={nicBackFile?.uri}
            onChangeAcceptedDeclaration={setAcceptedDeclaration}
            onUploadBack={() => handlePickImage(setNicBackFile, "nic-back")}
            onNext={() => {
              if (!nicBackFile) {
                Alert.alert("NIC Back", "Please upload the NIC back image.");
                return;
              }
              if (!acceptedDeclaration) {
                Alert.alert("Declaration", "Please accept the declaration to continue.");
                return;
              }
              navigation.navigate("KycAddressProof");
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="KycAddressProof">
        {({ navigation }) => (
          <KycAddressProofScreen
            documentNumber={documentNumber}
            addressProofFileName={addressProofFile?.name}
            onChangeDocumentNumber={setDocumentNumber}
            onUploadAddressProof={() =>
              handlePickDocument(setAddressProofFile, "address-proof")
            }
            onNext={() => {
              if (!documentNumber.trim()) {
                Alert.alert("Document Number", "Please enter the document number.");
                return;
              }
              if (!addressProofFile) {
                Alert.alert("Address Proof", "Please upload an address proof document.");
                return;
              }
              navigation.navigate("KycBankDetails");
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="KycBankDetails">
        {({ navigation }) => (
          <KycBankDetailsScreen
            accountNumber={accountNumber}
            confirmAccountNumber={confirmAccountNumber}
            bankName={bankName}
            branchCode={branchCode}
            accountType={accountType}
            bankDocumentFileName={bankDocumentFile?.name}
            onChangeAccountNumber={setAccountNumber}
            onChangeConfirmAccountNumber={setConfirmAccountNumber}
            onChangeBankName={setBankName}
            onChangeBranchCode={setBranchCode}
            onChangeAccountType={setAccountType}
            onUploadBankDocument={() =>
              handlePickDocument(setBankDocumentFile, "bank-document")
            }
            onNext={() => {
              if (!accountNumber.trim() || !confirmAccountNumber.trim()) {
                Alert.alert("Bank Account", "Please enter and confirm the account number.");
                return;
              }
              if (accountNumber !== confirmAccountNumber) {
                Alert.alert("Bank Account", "Account numbers do not match.");
                return;
              }
              if (!bankName.trim() || !branchCode.trim() || !accountType.trim()) {
                Alert.alert("Bank Details", "Please complete all bank details.");
                return;
              }
              if (!bankDocumentFile) {
                Alert.alert("Bank Document", "Please upload a bank document.");
                return;
              }
              navigation.navigate("KycPhoto");
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="KycPhoto">
        {({ navigation }) => (
          <KycPhotoScreen
            photoFileName={photoFile?.name}
            photoPreviewUri={photoFile?.uri}
            onUploadPhoto={() => handlePickImage(setPhotoFile, "profile-photo")}
            onNext={() => {
              if (!photoFile) {
                Alert.alert("Photo", "Please upload your profile photo.");
                return;
              }
              navigation.navigate("KycSuccess");
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="KycSuccess">
        {() => (
          <KycSuccessScreen
            buttonTitle={submitting ? "Submitting..." : "Back to home"}
            onBackHome={handleCompleteKyc}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
