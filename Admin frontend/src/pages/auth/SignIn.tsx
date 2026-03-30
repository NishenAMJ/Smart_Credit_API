import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    // Simulate auth — replace with your real API call later
    setTimeout(() => {
      if (email === "admin@smartcredit.com" && password === "admin123") {
        localStorage.setItem("adminToken", "demo-token-123");
        navigate("/dashboard");
      } else {
        setError("Invalid email or password.");
        setLoading(false);
      }
    }, 1000);
  }

  return (
    <div style={styles.page}>

      {/* ── Left panel ── */}
      <div style={styles.left}>
        <div style={styles.leftInner}>

          {/* Logo */}
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}>SC</div>
            <span style={styles.logoText}>Smart Credit+</span>
          </div>

          {/* Headline */}
          <div style={styles.headline}>
            <h1 style={styles.h1}>
              The future of<br />
              <span style={styles.h1Blue}>peer-to-peer lending</span><br />
              is here.
            </h1>
            <p style={styles.tagline}>
              Manage your platform with full control and real-time insights.
            </p>
          </div>

          {/* Stats row */}
          <div style={styles.statsRow}>
            {[
              { value: "10K+", label: "Active Users"  },
              { value: "98%",  label: "Approval Rate" },
              { value: "24/7", label: "Monitoring"    },
            ].map((s) => (
              <div key={s.label} style={styles.statItem}>
                <div style={styles.statValue}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={styles.right}>
        <div style={styles.formCard}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={styles.formTitle}>Welcome back</h2>
            <p style={styles.formSub}>Sign in to your admin account</p>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Email */}
            <div>
              <label style={styles.label}>Email address</label>
              <input
                type="email"
                className="input"
                placeholder="admin@smartcredit.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {/* Password */}
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
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", marginTop: 4, height: 48, fontSize: 15 }}
              disabled={loading}
            >
              {loading ? (
                <span style={styles.spinner} />
              ) : (
                "Sign In"
              )}
            </button>

          </form>

          {/* Footer link */}
          <p style={styles.footerText}>
            Don't have an account?{" "}
            <Link to="/signup" style={styles.link}>
              Create account
            </Link>
          </p>

          {/* Demo hint */}
          <div style={styles.demoBox}>
            <span style={styles.demoLabel}>Demo credentials</span>
            <span style={styles.demoValue}>admin@smartcredit.com / admin123</span>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#F5F6FA",
  },

  // Left
  left: {
    flex: 1,
    background: "#0A1628",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px",
    position: "relative",
    overflow: "hidden",
  },
  leftInner: {
    maxWidth: 420,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 40,
    zIndex: 1,
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
    fontWeight: 500,
  },

  // Right
  right: {
    width: 480,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 40px",
    background: "#FFFFFF",
  },
  formCard: {
    width: "100%",
    maxWidth: 380,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#1A1A1A",
    marginBottom: 6,
  },
  formSub: {
    fontSize: 14,
    color: "#6B7280",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#1A1A1A",
    marginBottom: 6,
  },
  forgotBtn: {
    background: "none",
    border: "none",
    fontSize: 13,
    color: "#007AFF",
    cursor: "pointer",
    fontWeight: 500,
    padding: 0,
    fontFamily: "inherit",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    padding: 0,
    lineHeight: 1,
  },
  errorBox: {
    background: "#FEE2E2",
    color: "#991B1B",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
  },
  footerText: {
    textAlign: "center",
    fontSize: 13,
    color: "#6B7280",
    marginTop: 20,
  },
  link: {
    color: "#007AFF",
    fontWeight: 600,
    textDecoration: "none",
  },
  demoBox: {
    marginTop: 20,
    background: "#F5F6FA",
    borderRadius: 8,
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  demoLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  demoValue: {
    fontSize: 12,
    color: "#1A1A1A",
    fontFamily: "monospace",
  },
  spinner: {
    width: 18,
    height: 18,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.7s linear infinite",
  },
};