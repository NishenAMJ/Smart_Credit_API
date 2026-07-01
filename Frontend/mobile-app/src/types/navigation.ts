/** @format */

import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type {
  BorrowerApplication,
  BorrowerLoan,
  BorrowerTransaction,
} from "./borrower";

export type BorrowerStackParamList = {
  BorrowerTabs:
    | NavigatorScreenParams<{
        Home: undefined;
        Loans: undefined;
        Payments: undefined;
        Support: undefined;
        Agreement: { initialLoanId?: string } | undefined;
        Profile: undefined;
      }>
    | undefined;
  Home: undefined;
  Loans: undefined;
  Payments: undefined;
  Support: undefined;
  Agreement: { initialLoanId?: string } | undefined;
  Profile: undefined;
  MyLoans: undefined;
  LoanDetails: { loan: BorrowerLoan };
  LoanApplication: { loan?: BorrowerLoan } | undefined;
  MyApplications: undefined;
  ApplicationDetails: { application?: BorrowerApplication } | undefined;
  TransactionDetails: { transaction: BorrowerTransaction };
  CreditScore: undefined;
  CreditHistory: undefined;
  HelpCenter: undefined;
  ContactSupport: { initialCategory?: string } | undefined;
  Notifications: undefined;
  LoanAgreement: { initialLoanId?: string } | undefined;
  NearbyLendersMap: undefined;
};

export type BorrowerNavigation =
  NativeStackNavigationProp<BorrowerStackParamList>;
