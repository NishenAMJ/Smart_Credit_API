import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check, Eye, EyeOff, AlertTriangle } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormData {
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string;
  department:  string;
  role:        string;
  password:    string;
  confirm:     string;
  agreeTerms:  boolean;
}

interface FormErrors {
  firstName?:  string;
  lastName?:   string;
  email?:      string;
  phone?:      string;
  department?: string;
  role?:       string;
  password?:   string;
  confirm?:    string;
  agreeTerms?: string;
}

// ── Password strength checker ─────────────────────────────────────────────────
function getPasswordStrength(password: string): {
  score:  number;
  label:  string;
  color:  string;
} {
  if (!password) return { score: 0, label: "",        color: "#E5E7EB" };
  let score = 0;
  if (password.length >= 8)              score++;
  if (password.length >= 12)             score++;
  if (/[A-Z]/.test(password))            score++;
  if (/[0-9]/.test(password))            score++;
  if (/[^A-Za-z0-9]/.test(password))    score++;

  if (score <= 1) return { score, label: "Weak",      color: "#EF4444" };
  if (score <= 3) return { score, label: "Fair",       color: "#F59E0B" };
  if (score <= 4) return { score, label: "Good",       color: "#007AFF" };
  return            { score, label: "Strong",    color: "#10B981" };
}

// ── Password strength bar ──────────────────────────────────────────────────────
function StrengthBar({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              flex:         1,
              height:       3,
              borderRadius: 99,
              background:   i <= score ? color : "#E5E7EB",
              transition:   "background 0.2s",
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 11, fontWeight: 600, color }}>{label}</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function SignUp() {
  const navigate = useNavigate();

  const [form, setForm]       = useState<FormData>({
    firstName:  "",
    lastName:   "",
    email:      "",
    phone:      "",
    department: "",
    role:       "",
    password:   "",
    confirm:    "",
    agreeTerms: false,
  });

  const [errors, setErrors]   = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [step, setStep]       = useState<1 | 2>(1);

  // ── Field updater ────────────────────────────────────────────────────────────
  function update(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // ── Validate step 1 ──────────────────────────────────────────────────────────
  function validateStep1(): boolean {
    const e: FormErrors = {};
    if (!form.firstName.trim())  e.firstName  = "First name is required.";
    if (!form.lastName.trim())   e.lastName   = "Last name is required.";
    if (!form.email.trim())      e.email      = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email address.";
    if (!form.phone.trim())      e.phone      = "Phone number is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Validate step 2 ──────────────────────────────────────────────────────────
  function validateStep2(): boolean {
    const e: FormErrors = {};
    if (!form.department.trim()) e.department = "Department is required.";
    if (!form.role.trim())       e.role       = "Role is required.";
    if (!form.password)          e.password   = "Password is required.";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
    if (!form.confirm)           e.confirm    = "Please confirm your password.";
    else if (form.password !== form.confirm) e.confirm = "Passwords do not match.";
    if (!form.agreeTerms)        e.agreeTerms = "You must agree to the terms.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Next step ────────────────────────────────────────────────────────────────
  function handleNext() {
    if (validateStep1()) setStep(2);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);
    // Simulate API call — replace with real endpoint later
    setTimeout(() => {
      localStorage.setItem("adminToken", "demo-token-123");
      navigate("/dashboard");
    }, 1200);
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
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h1 style={styles.h1}>
              The future of<br />
              <span style={styles.h1Blue}>peer-to-peer lending</span><br />
              is here.
            </h1>
            <p style={styles.tagline}>
              Create your admin account to start managing the platform with full control.
            </p>
          </div>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              "Full KYC verification control",
              "Real-time analytics dashboard",
              "Manage lenders and borrowers",
              "Audit logs and compliance tools",
            ].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={styles.checkCircle}>
                  <Check size={12} color="#007AFF" />
                </div>
                <span style={{ fontSize: 14, color: "#8A9BB5" }}>{item}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={styles.right}>
        <div style={styles.formCard}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={styles.formTitle}>Create Account</h2>
            <p style={styles.formSub}>Set up your admin account for Smart Credit+</p>
          </div>

          {/* ── Step indicator ── */}
          <div style={styles.stepRow}>
            {[1, 2].map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <div style={{
                  width:      28,
                  height:     28,
                  borderRadius: "50%",
                  background:  step >= s ? "#007AFF" : "#F3F4F6",
                  color:       step >= s ? "#FFFFFF" : "#9CA3AF",
                  display:    "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize:   12,
                  fontWeight: 700,
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}>
                  {step > s ? <Check size={13} /> : s}
                </div>
                <span style={{
                  fontSize:   13,
                  fontWeight: step === s ? 600 : 400,
                  color:      step === s ? "#1A1A1A" : "#9CA3AF",
                }}>
                  {s === 1 ? "Personal Info" : "Account Setup"}
                </span>
                {s < 2 && (
                  <div style={{
                    flex: 1,
                    height: 1,
                    background: step > s ? "#007AFF" : "#E5E7EB",
                    marginLeft: 4,
                    transition: "background 0.2s",
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* ── Step 1: Personal Info ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Name row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={styles.label}>First Name</label>
                  <input
                    className="input"
                    placeholder="Super"
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    style={errors.firstName ? styles.inputError : {}}
                  />
                  {errors.firstName && <p style={styles.errorText}>{errors.firstName}</p>}
                </div>
                <div>
                  <label style={styles.label}>Last Name</label>
                  <input
                    className="input"
                    placeholder="Admin"
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    style={errors.lastName ? styles.inputError : {}}
                  />
                  {errors.lastName && <p style={styles.errorText}>{errors.lastName}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={styles.label}>Email Address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="admin@smartcredit.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  style={errors.email ? styles.inputError : {}}
                />
                {errors.email && <p style={styles.errorText}>{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label style={styles.label}>Phone Number</label>
                <input
                  className="input"
                  type="tel"
                  placeholder="+94 77 123 4567"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  style={errors.phone ? styles.inputError : {}}
                />
                {errors.phone && <p style={styles.errorText}>{errors.phone}</p>}
              </div>

              {/* Next button */}
              <button
                type="button"
                className="btn-primary"
                style={{ width: "100%", height: 48, fontSize: 15, marginTop: 4 }}
                onClick={handleNext}
              >
                Continue →
              </button>

            </div>
          )}

          {/* ── Step 2: Account Setup ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Department */}
              <div>
                <label style={styles.label}>Department</label>
                <select
                  className="input"
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  style={{
                    ...(errors.department ? styles.inputError : {}),
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select department</option>
                  <option value="Platform Operations">Platform Operations</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Customer Support">Customer Support</option>
                  <option value="Risk Management">Risk Management</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                </select>
                {errors.department && <p style={styles.errorText}>{errors.department}</p>}
              </div>

              {/* Role */}
              <div>
                <label style={styles.label}>Admin Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                  style={{
                    ...(errors.role ? styles.inputError : {}),
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select role</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Moderator">Moderator</option>
                  <option value="Analyst">Analyst</option>
                  <option value="Support">Support</option>
                </select>
                {errors.role && <p style={styles.errorText}>{errors.role}</p>}
              </div>

              {/* Password */}
              <div>
                <label style={styles.label}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="input"
                    type={showPass ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    style={{
                      paddingRight: 44,
                      ...(errors.password ? styles.inputError : {}),
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={styles.eyeBtn}
                  >
                    {showPass
                      ? <EyeOff size={15} color="#6B7280" />
                      : <Eye    size={15} color="#6B7280" />
                    }
                  </button>
                </div>
                <StrengthBar password={form.password} />
                {errors.password && <p style={styles.errorText}>{errors.password}</p>}
              </div>

              {/* Confirm password */}
              <div>
                <label style={styles.label}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="input"
                    type={showConf ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={form.confirm}
                    onChange={(e) => update("confirm", e.target.value)}
                    style={{
                      paddingRight: 44,
                      ...(errors.confirm ? styles.inputError : {}),
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConf(!showConf)}
                    style={styles.eyeBtn}
                  >
                    {showConf
                      ? <EyeOff size={15} color="#6B7280" />
                      : <Eye    size={15} color="#6B7280" />
                    }
                  </button>
                </div>
                {/* Match indicator */}
                {form.confirm && form.password && (
                  <p style={{ fontSize: 11, marginTop: 5, fontWeight: 600, color: form.password === form.confirm ? "#10B981" : "#EF4444" }}>
                    {form.password === form.confirm ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </p>
                )}
                {errors.confirm && <p style={styles.errorText}>{errors.confirm}</p>}
              </div>

              {/* Terms */}
              <div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <input
                    type="checkbox"
                    id="terms"
                    checked={form.agreeTerms}
                    onChange={(e) => update("agreeTerms", e.target.checked)}
                    style={{ marginTop: 2, cursor: "pointer", flexShrink: 0 }}
                  />
                  <label htmlFor="terms" style={{ fontSize: 13, color: "#6B7280", cursor: "pointer", lineHeight: 1.5 }}>
                    I agree to the{" "}
                    <span style={{ color: "#007AFF", fontWeight: 600 }}>Terms of Service</span>
                    {" "}and{" "}
                    <span style={{ color: "#007AFF", fontWeight: 600 }}>Privacy Policy</span>
                  </label>
                </div>
                {errors.agreeTerms && (
                  <p style={{ ...styles.errorText, display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                    <AlertTriangle size={11} /> {errors.agreeTerms}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, height: 48 }}
                  onClick={() => setStep(1)}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 2, height: 48, fontSize: 15 }}
                  disabled={loading}
                >
                  {loading ? (
                    <span style={styles.spinner} />
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>

            </form>
          )}

          {/* Footer */}
          <p style={styles.footerText}>
            Already have an account?{" "}
            <Link to="/signin" style={styles.link}>Sign in</Link>
          </p>

        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    display:    "flex",
    minHeight:  "100vh",
    background: "#F5F6FA",
  },

  // Left panel
  left: {
    flex:       1,
    background: "#0A1628",
    display:    "flex",
    alignItems: "center",
    justifyContent: "center",
    padding:    "48px",
  },
  leftInner: {
    maxWidth:  420,
    width:     "100%",
    display:   "flex",
    flexDirection: "column",
    gap:       40,
  },
  logoRow: {
    display:    "flex",
    alignItems: "center",
    gap:        10,
  },
  logoIcon: {
    width:          36,
    height:         36,
    borderRadius:   9,
    background:     "#007AFF",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontSize:       13,
    fontWeight:     700,
    color:          "#fff",
  },
  logoText: {
    color:      "#FFFFFF",
    fontWeight: 700,
    fontSize:   16,
  },
  h1: {
    fontSize:   36,
    fontWeight: 700,
    color:      "#FFFFFF",
    lineHeight: 1.25,
  },
  h1Blue: {
    color: "#007AFF",
  },
  tagline: {
    fontSize:  15,
    color:     "#8A9BB5",
    lineHeight: 1.6,
    maxWidth:  340,
  },
  checkCircle: {
    width:          24,
    height:         24,
    borderRadius:   "50%",
    background:     "rgba(0,122,255,0.15)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },

  // Right panel
  right: {
    width:          520,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    padding:        "48px 40px",
    background:     "#FFFFFF",
    overflowY:      "auto",
  },
  formCard: {
    width:    "100%",
    maxWidth: 420,
  },
  formTitle: {
    fontSize:   24,
    fontWeight: 700,
    color:      "#1A1A1A",
    marginBottom: 6,
  },
  formSub: {
    fontSize: 14,
    color:    "#6B7280",
  },

  // Step indicator
  stepRow: {
    display:      "flex",
    alignItems:   "center",
    marginBottom: 24,
    gap:          4,
  },

  // Form fields
  label: {
    display:      "block",
    fontSize:     13,
    fontWeight:   500,
    color:        "#1A1A1A",
    marginBottom: 6,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize:   12,
    color:      "#EF4444",
    marginTop:  5,
    fontWeight: 500,
  },
  eyeBtn: {
    position:       "absolute",
    right:          12,
    top:            "50%",
    transform:      "translateY(-50%)",
    background:     "none",
    border:         "none",
    cursor:         "pointer",
    padding:        0,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
  },
  footerText: {
    textAlign:  "center",
    fontSize:   13,
    color:      "#6B7280",
    marginTop:  20,
  },
  link: {
    color:          "#007AFF",
    fontWeight:     600,
    textDecoration: "none",
  },
  spinner: {
    width:       18,
    height:      18,
    border:      "2px solid rgba(255,255,255,0.3)",
    borderTop:   "2px solid #fff",
    borderRadius: "50%",
    display:     "inline-block",
    animation:   "spin 0.7s linear infinite",
  },
};
