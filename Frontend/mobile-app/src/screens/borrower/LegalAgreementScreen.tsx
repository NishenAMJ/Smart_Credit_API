/** @format */

import React from "react";
import LegalAgreementScreen from "../shared/LegalAgreementScreen";

export default function BorrowerLegalAgreementScreen({ route }: any) {
  const { initialLoanId } = route.params || {};
  return <LegalAgreementScreen role="borrower" initialLoanId={initialLoanId} />;
}
