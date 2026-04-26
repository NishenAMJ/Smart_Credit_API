export type AuthVariant = "admin" | "friends";

export interface AuthContent {
  brandName: string;
  logoText: string;
  heroTitleStart: string;
  heroHighlight: string;
  heroTitleEnd: string;
  heroDescription: string;
  subtitle: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  supportCopy: string;
  primaryAction: string;
  footerPrompt: string;
  footerAction: string;
  footerTo: string;
  demoCredentials?: string;
  stats: Array<{ value: string; label: string }>;
}

export const authContent: Record<AuthVariant, AuthContent> = {
  admin: {
    brandName: "Smart Credit+",
    logoText: "SC",
    heroTitleStart: "The future of",
    heroHighlight: "peer-to-peer lending",
    heroTitleEnd: "is here.",
    heroDescription: "Manage your platform with full control and real-time insights.",
    subtitle: "Sign in to your admin account",
    emailPlaceholder: "sarah.admin@example.com",
    passwordPlaceholder: "Enter your password",
    supportCopy: "Forgot password?",
    primaryAction: "Sign In",
    footerPrompt: "Don't have an account?",
    footerAction: "Create account",
    footerTo: "/signup",
    demoCredentials: "sarah.admin@example.com / admin123",
    stats: [
      { value: "API", label: "Live Backend" },
      { value: "JWT", label: "Secure Access" },
      { value: "24/7", label: "Monitoring" },
    ],
  },
  friends: {
    brandName: "Smart Credit+",
    logoText: "FR",
    heroTitleStart: "Stay close to",
    heroHighlight: "your lending circle",
    heroTitleEnd: "every day.",
    heroDescription: "Track shared activity, discover updates, and manage your friend network with confidence.",
    subtitle: "Sign in to your friends portal",
    emailPlaceholder: "friend@example.com",
    passwordPlaceholder: "Enter your password",
    supportCopy: "Need help?",
    primaryAction: "Continue",
    footerPrompt: "Need an account?",
    footerAction: "Contact admin",
    footerTo: "/signin",
    demoCredentials: "Use your assigned Smart Credit friends account",
    stats: [
      { value: "LIVE", label: "Realtime Updates" },
      { value: "SAFE", label: "Protected Access" },
      { value: "SYNC", label: "Shared Activity" },
    ],
  },
};
