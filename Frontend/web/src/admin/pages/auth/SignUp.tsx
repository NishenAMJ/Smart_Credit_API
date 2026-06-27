import SharedAuthPage from "./SharedAuthPage";

// Renders the admin sign-up page using the shared auth experience.
export default function SignUp() {
  return <SharedAuthPage initialMode="register" />;
}
