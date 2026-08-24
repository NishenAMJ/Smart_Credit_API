import SharedAuthPage from "./SharedAuthPage";

// Renders the admin sign-in page using the shared auth experience.
// ADMIN: Login - frontend
export default function SignIn() {
  return <SharedAuthPage initialMode="login" />;
}
