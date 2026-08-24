/** @format */

import React from "react";
import BorrowerPageHeader from "./BorrowerPageHeader";

type LoanDetailsHeaderProps = {
  title: string;
  onBack?: () => void;
};

/**
 * Header section for borrower loan details and key values.
 */
export default function LoanDetailsHeader({
  title,
  onBack,
}: LoanDetailsHeaderProps) {
  return <BorrowerPageHeader title={title} onBack={onBack} />;
}
