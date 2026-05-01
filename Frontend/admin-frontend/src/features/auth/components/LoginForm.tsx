import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { AuthContent } from "../config/auth-content";
import { authStyles } from "../config/auth-styles";

interface LoginFormProps {
  content: AuthContent;
  loading: boolean;
  error: string;
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
  onHelpClick?: () => void;
}

export default function LoginForm({
  content,
  loading,
  error,
  onSubmit,
  onHelpClick,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ email, password });
  }

  return (
    <>
      {error ? <div style={authStyles.errorBox}>{error}</div> : null}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={authStyles.label}>Email address</label>
          <input
            type="email"
            className="input"
            placeholder={content.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <label style={authStyles.label}>Password</label>
            <button
              type="button"
              onClick={onHelpClick}
              style={authStyles.helperAction}
            >
              {content.supportCopy}
            </button>
          </div>

          <div style={authStyles.inputWrap}>
            <input
              type={showPass ? "text" : "password"}
              className="input"
              placeholder={content.passwordPlaceholder}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPass((value) => !value)}
              style={authStyles.eyeBtn}
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{ width: "100%", marginTop: 4, height: 48, fontSize: 15 }}
          disabled={loading}
        >
          {loading ? <span style={authStyles.spinner} /> : content.primaryAction}
        </button>
      </form>
    </>
  );
}
