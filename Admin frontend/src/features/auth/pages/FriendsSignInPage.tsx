import { useState } from "react";
import AuthSplitLayout from "../components/AuthSplitLayout";
import LoginForm from "../components/LoginForm";
import { authContent } from "../config/auth-content";
import { getMissingFirebaseConfig, isFirebaseConfigured } from "../../../shared/config/firebase";

export default function FriendsSignInPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(values: { email: string; password: string }) {
    if (!values.email || !values.password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    await new Promise((resolve) => {
      window.setTimeout(resolve, 450);
    });

    setLoading(false);

    if (!isFirebaseConfigured()) {
      setError(
        `Friends authentication is ready, but Firebase still needs these env values: ${getMissingFirebaseConfig().join(", ")}.`,
      );
      return;
    }

    setError("Firebase is configured. The next step is wiring your exact friends auth and Firestore collections.");
  }

  return (
    <AuthSplitLayout content={authContent.friends} title="Welcome back">
      <LoginForm
        content={authContent.friends}
        loading={loading}
        error={error}
        onSubmit={handleLogin}
        onHelpClick={() => {
          window.alert("Send the Firebase web app config next, and I’ll complete the live friends sign-in.");
        }}
      />
    </AuthSplitLayout>
  );
}
