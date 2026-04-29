import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { adminLogin } from "../../lib/api";
import { setAdminSession } from "../../lib/auth";

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await adminLogin(email, password);
      setAdminSession(response.accessToken, response.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}>SC</div>
            <span style={styles.logoText}>Smart Credit+</span>
          </div>

          <div style={styles.headline}>
            <h1 style={styles.h1}>
              The future of
              <br />
              <span style={styles.h1Blue}>peer-to-peer lending</span>
              <br />
              is here.
            </h1>
            <p style={styles.tagline}>
              Manage your platform with full control and real-time insights.
            </p>
          </div>

          <div style={styles.statsRow}>
            {[
              { value: "API", label: "Live Backend" },
              { value: "JWT", label: "Secure Access" },
              { value: "24/7", label: "Monitoring" },
            ].map((s) => (
              <div key={s.label} style={styles.statItem}>
                <div style={styles.statValue}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.formCard}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={styles.formTitle}>Welcome back</h2>
            <p style={styles.formSub}>Sign in to your admin account</p>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={styles.label}>Email address</label>
              <input
                type="email"
                className="input"
                placeholder="admin@smartcredit.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={styles.label}>Password</label>
                <button
                  type="button"
                  style={styles.forgotBtn}
                  onClick={() => alert("Contact your system administrator to reset your password.")}
                >
                  Forgot password?
                </button>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  className="input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={styles.eyeBtn}
                >
                  {showPass ? "🤫" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", marginTop: 4, height: 48, fontSize: 15 }}
              disabled={loading}
            >
              {loading ? <span style={styles.spinner} /> : "Sign In"}
            </button>
          </form>

          <p style={styles.footerText}>
            Don't have an account?{" "}
            <Link to="/signup" style={styles.link}>
              Create account
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#F5F6FA",
  },
  left: {
    flex: 1,
    background: "#0A1628",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px",
    overflow: "hidden",
  },
  leftInner: {
    maxWidth: 420,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 40,
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    background: "#007AFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
  },
  logoText: {
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: 16,
  },
  headline: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  h1: {
    fontSize: 38,
    fontWeight: 700,
    color: "#FFFFFF",
    lineHeight: 1.25,
  },
  h1Blue: {
    color: "#007AFF",
  },
  tagline: {
    fontSize: 15,
    color: "#8A9BB5",
    lineHeight: 1.6,
    maxWidth: 340,
  },
  statsRow: {
    display: "flex",
    gap: 32,
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#8A9BB5",
  },
  right: {
    width: "50%",
    minWidth: 440,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  formCard: {
    width: "100%",
    maxWidth: 430,
    background: "#FFFFFF",
    borderRadius: 20,
    padding: 36,
    boxShadow: "0 18px 60px rgba(15, 23, 42, 0.08)",
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#0F172A",
  },
  formSub: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 14,
  },
  errorBox: {
    marginBottom: 20,
    background: "#FEF2F2",
    color: "#B91C1C",
    border: "1px solid #FECACA",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 14,
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
  },
  forgotBtn: {
    background: "transparent",
    border: "none",
    color: "#007AFF",
    fontSize: 12,
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 16,
  },
  spinner: {
    width: 18,
    height: 18,
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "#FFFFFF",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 1s linear infinite",
  },
  footerText: {
    marginTop: 22,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  link: {
    color: "#007AFF",
    textDecoration: "none",
    fontWeight: 600,
  },
  demoBox: {
    marginTop: 22,
    background: "#F8FAFC",
    borderRadius: 12,
    border: "1px solid #E2E8F0",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  demoLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 600,
  },
  demoValue: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: 600,
  },
};
