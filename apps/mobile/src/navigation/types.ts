export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  OtpVerification: {
    purpose: "login" | "register";
    contact: string;
  };
  KycFlow: undefined;
  Dashboard: {
    userId: string;
  };
};

export type KycStackParamList = {
  KycNicFront: undefined;
  KycNicBack: undefined;
  KycAddressProof: undefined;
  KycBankDetails: undefined;
  KycPhoto: undefined;
  KycSuccess: undefined;
};
