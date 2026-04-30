/** @format */

export type SupportConversation = {
  id: string;
  lenderName: string;
  lastMessage: string;
  lastSeen: string;
  unreadCount: number;
  isOnline: boolean;
};

export type SupportQuickAction = {
  id: string;
  title: string;
  subtitle: string;
  icon: "help-circle" | "phone-call" | "file-text";
};

export type HelpCategory = "Borrower" | "Lender" | "Technical";

export type HelpFaq = {
  id: string;
  category: HelpCategory;
  question: string;
  answer: string;
};

export const supportConversations: SupportConversation[] = [
  {
    id: "conv-1",
    lenderName: "People's Micro Finance",
    lastMessage: "Please upload your salary slip to continue approval.",
    lastSeen: "2m ago",
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: "conv-2",
    lenderName: "City Trust Lending",
    lastMessage: "We can offer a revised plan with a 12-month tenure.",
    lastSeen: "14m ago",
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: "conv-3",
    lenderName: "Rapid Loan Hub",
    lastMessage: "Your loan has moved to final verification.",
    lastSeen: "1h ago",
    unreadCount: 1,
    isOnline: true,
  },
];

export const supportQuickActions: SupportQuickAction[] = [
  {
    id: "qa-1",
    title: "Help Center",
    subtitle: "Browse verified answers and guides",
    icon: "help-circle",
  },
  {
    id: "qa-2",
    title: "Request a Call",
    subtitle: "Get a callback from support agent",
    icon: "phone-call",
  },
  {
    id: "qa-3",
    title: "Raise Dispute",
    subtitle: "Report repayment or statement issue",
    icon: "file-text",
  },
];

export const helpCenterCategories: Array<"All" | HelpCategory> = [
  "All",
  "Borrower",
  "Lender",
  "Technical",
];

export const helpCenterFaqs: HelpFaq[] = [
  {
    id: "faq-1",
    category: "Borrower",
    question: "How is my credit score calculated?",
    answer:
      "Your score is calculated from repayment consistency, income patterns, and account activity. Paying on time improves your score.",
  },
  {
    id: "faq-2",
    category: "Borrower",
    question: "What happens if I miss a payment?",
    answer:
      "The installment is marked overdue and reminders are sent. Repeated missed payments may reduce your credit score and restrict future loan access.",
  },
  {
    id: "faq-3",
    category: "Lender",
    question: "How do I withdraw my earnings?",
    answer:
      "Open your lender wallet, choose Withdraw, select a linked bank account, and confirm. Processing is typically completed within 1-2 business days.",
  },
  {
    id: "faq-4",
    category: "Lender",
    question: "What is the risk of default?",
    answer:
      "Default risk depends on borrower profile and repayment history. Use credit score, KYC status, and repayment trends before approving a loan.",
  },
  {
    id: "faq-5",
    category: "Technical",
    question: "How can I reset my password?",
    answer:
      "Go to Login, tap Forgot Password, enter your registered email or phone, and follow the verification instructions.",
  },
  {
    id: "faq-6",
    category: "Technical",
    question: "How does QR payment verification work?",
    answer:
      "After scanning and paying, the transaction receipt is matched with your loan installment. If verification is delayed, submit the receipt from Support.",
  },
];
