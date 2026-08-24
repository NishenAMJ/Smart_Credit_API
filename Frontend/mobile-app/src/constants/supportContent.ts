/** @format */

export type SupportQuickActionId =
  | "help-center"
  | "contact-support"
  | "request-call"
  | "raise-dispute";

export type SupportQuickAction = {
  id: SupportQuickActionId;
  title: string;
  subtitle: string;
  icon: "help-circle" | "message-square" | "phone-call" | "alert-circle";
};

export type HelpCategory = "Loans" | "Payments" | "Account" | "Technical";

export type HelpFaq = {
  id: string;
  category: HelpCategory;
  question: string;
  answer: string;
};

export const supportQuickActions: SupportQuickAction[] = [
  {
    id: "help-center",
    title: "Help Center",
    subtitle: "Find answers and guidance",
    icon: "help-circle",
  },
  {
    id: "contact-support",
    title: "Contact Support",
    subtitle: "Send a support request",
    icon: "message-square",
  },
  {
    id: "request-call",
    title: "Request a Call",
    subtitle: "Ask the team to call you",
    icon: "phone-call",
  },
  {
    id: "raise-dispute",
    title: "Raise Dispute",
    subtitle: "Report a loan or payment issue",
    icon: "alert-circle",
  },
];

export const helpCenterCategories: Array<"All" | HelpCategory> = [
  "All",
  "Loans",
  "Payments",
  "Account",
  "Technical",
];

export const helpCenterFaqs: HelpFaq[] = [
  {
    id: "faq-loan-application",
    category: "Loans",
    question: "Why can't I apply for a loan listing?",
    answer:
      "Your borrower account must have approved KYC before you can submit a loan application. Check your KYC status from your profile and resubmit documents if a review was rejected.",
  },
  {
    id: "faq-application-status",
    category: "Loans",
    question: "Where can I check my loan application?",
    answer:
      "Open My Applications to see whether a request is submitted, under review, approved, rejected, or converted into a loan.",
  },
  {
    id: "faq-agreement",
    category: "Loans",
    question: "How do I review and sign an agreement?",
    answer:
      "Open Agreements, select the agreement linked to your loan, review the terms carefully, then enter your legal name and provide consent before signing.",
  },
  {
    id: "faq-receipt-review",
    category: "Payments",
    question: "Why is my bank-transfer receipt still pending?",
    answer:
      "A submitted bank-transfer receipt remains pending until the lender reviews it. You can follow its status from Payments and raise a dispute if the result is incorrect.",
  },
  {
    id: "faq-overdue",
    category: "Payments",
    question: "What happens when an installment is overdue?",
    answer:
      "The installment remains outstanding and the loan may be marked overdue. Contact your lender or support promptly if you believe the payment status is wrong.",
  },
  {
    id: "faq-kyc",
    category: "Account",
    question: "How do I resolve a rejected KYC review?",
    answer:
      "Open your profile to read the rejection reason, then use the KYC resubmission option to provide corrected, clear documents.",
  },
  {
    id: "faq-location",
    category: "Account",
    question: "How is my location used?",
    answer:
      "Location permission is optional. When enabled, the app saves an approximate borrower location to support nearby-lender features. You can continue using the app without granting it.",
  },
  {
    id: "faq-technical",
    category: "Technical",
    question: "What should I include in a technical support request?",
    answer:
      "Describe what you tried, the screen where it happened, and the exact error message. Do not include passwords, access tokens, bank PINs, or other secrets.",
  },
];
