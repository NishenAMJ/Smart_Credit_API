import { useState, useRef } from "react";
import {
  User, Lock, Bell, Shield,
  Camera, Check, Eye, EyeOff,
  AlertTriangle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type SettingsTab = "profile" | "security" | "notifications" | "platform";

// ── Mock admin data ───────────────────────────────────────────────────────────
const INITIAL_PROFILE = {
  firstName:   "Super",
  lastName:    "Admin",
  email:       "admin@smartcredit.com",
  phone:       "+94 77 123 4567",
  role:        "Super Admin",
  department:  "Platform Operations",
  bio:         "Managing the Smart Credit+ platform operations and compliance.",
  avatarColor: "#007AFF",
  avatarBg:    "#EFF6FF",
};

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "profile",       label: "Profile",        icon: User   },
  { id: "security",      label: "Security",        icon: Lock   },
  { id: "notifications", label: "Notifications",   icon: Bell   },
  { id: "platform",      label: "Platform",        icon: Shield },
];

// ── Reusable field row ────────────────────────────────────────────────────────
function FieldRow({
  label,
  hint,
  children,
}: {
  label:    string;
  hint?:    string;
  children: React.ReactNode;
}) {
  return (
    <div style={F.row}>
      <div style={F.labelCol}>
        <p style={F.label}>{label}</p>
        {hint && <p style={F.hint}>{hint}</p>}
      </div>
      <div style={F.inputCol}>{children}</div>
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
}: {
  checked:  boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background:   checked ? "#007AFF" : "#E5E7EB",
        cursor:       "pointer",
        position:     "relative",
        transition:   "background 0.2s",
        flexShrink:   0,
      }}
    >
      <div style={{
        position:   "absolute",
        top:        3,
        left:       checked ? 23 : 3,
        width:      18,
        height:     18,
        borderRadius: "50%",
        background: "#FFFFFF",
        boxShadow:  "0 1px 3px rgba(0,0,0,0.2)",
        transition: "left 0.2s",
      }} />
    </div>
  );
}

// ── Save toast ────────────────────────────────────────────────────────────────
function SaveToast({ show }: { show: boolean }) {
  return (
    <div style={{
      position:   "fixed",
      bottom:     32,
      right:      32,
      background: "#1A1A1A",
      color:      "#FFFFFF",
      borderRadius: 10,
      padding:    "12px 20px",
      fontSize:   14,
      fontWeight: 500,
      display:    "flex",
      alignItems: "center",
      gap:        8,
      opacity:    show ? 1 : 0,
      transform:  show ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 0.25s, transform 0.25s",
      zIndex:     9999,
      pointerEvents: "none",
    }}>
      <Check size={15} color="#10B981" />
      Changes saved successfully
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  title,
  subtitle,
  children,
}: {
  title:     string;
  subtitle?: string;
  children:  React.ReactNode;
}) {
  return (
    <div style={Se.wrap}>
      <div style={Se.header}>
        <p style={Se.title}>{title}</p>
        {subtitle && <p style={Se.sub}>{subtitle}</p>}
      </div>
      <div style={Se.body}>{children}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Settings() {
  const [activeTab, setTab]       = useState<SettingsTab>("profile");
  const [toast, setToast]         = useState(false);
  const [profile, setProfile]     = useState(INITIAL_PROFILE);
  const [showOld, setShowOld]     = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [passwords, setPasswords] = useState({ old: "", new: "", confirm: "" });
  const [passError, setPassError] = useState("");
  const fileRef                   = useRef<HTMLInputElement>(null);

  // ── Notifications state ───────────────────────────────────────────────────
  const [notifs, setNotifs] = useState({
    kycAlerts:       true,
    userFlags:       true,
    adSubmissions:   true,
    systemReports:   false,
    loginAlerts:     true,
    weeklyDigest:    false,
    emailNotifs:     true,
    browserNotifs:   false,
  });

  // ── Platform settings state ───────────────────────────────────────────────
  const [platform, setPlatform] = useState({
    maintenanceMode:  false,
    autoKYCReview:    false,
    adAutoApproval:   false,
    twoFactorEnforce: true,
    maxInterestRate:  "15",
    minLoanAmount:    "5000",
    maxLoanAmount:    "1000000",
    sessionTimeout:   "30",
  });

  // ── Save handler ──────────────────────────────────────────────────────────
  function handleSave() {
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  // ── Password change ───────────────────────────────────────────────────────
  function handlePasswordChange() {
    setPassError("");
    if (!passwords.old || !passwords.new || !passwords.confirm) {
      setPassError("Please fill in all password fields.");
      return;
    }
    if (passwords.new.length < 8) {
      setPassError("New password must be at least 8 characters.");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setPassError("New passwords do not match.");
      return;
    }
    setPasswords({ old: "", new: "", confirm: "" });
    handleSave();
  }

  // ── Profile update ────────────────────────────────────────────────────────
  function updateProfile(field: string, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  // ── Platform update ───────────────────────────────────────────────────────
  function updatePlatform(field: string, value: string | boolean) {
    setPlatform((prev) => ({ ...prev, [field]: value }));
  }

  // ── Notif update ──────────────────────────────────────────────────────────
  function updateNotif(field: string, value: boolean) {
    setNotifs((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div>

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and platform preferences</p>
        </div>
        <button className="btn-primary" onClick={handleSave}>
          <Check size={15} /> Save Changes
        </button>
      </div>

      <div style={S.layout}>

        {/* ── Sidebar tabs ── */}
        <div style={S.tabsSidebar}>

          {/* Admin card */}
          <div style={S.adminCard}>
            <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto 12px" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: profile.avatarBg,
                color:      profile.avatarColor,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, fontWeight: 700,
              }}>
                {profile.firstName[0]}{profile.lastName[0]}
              </div>
              <button
                style={S.cameraBtn}
                onClick={() => fileRef.current?.click()}
              >
                <Camera size={12} color="#fff" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A", textAlign: "center" }}>
              {profile.firstName} {profile.lastName}
            </p>
            <p style={{ fontSize: 12, color: "#6B7280", textAlign: "center", marginTop: 2 }}>
              {profile.role}
            </p>
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <span style={{ background: "#EFF6FF", color: "#1E40AF", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
                {profile.department}
              </span>
            </div>
          </div>

          {/* Tab list */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  display:     "flex",
                  alignItems:  "center",
                  gap:         10,
                  padding:     "10px 14px",
                  borderRadius: 8,
                  border:      "none",
                  background:  activeTab === id ? "#EFF6FF" : "transparent",
                  color:       activeTab === id ? "#007AFF" : "#6B7280",
                  fontSize:    14,
                  fontWeight:  activeTab === id ? 600 : 500,
                  cursor:      "pointer",
                  fontFamily:  "inherit",
                  transition:  "all 0.15s",
                  textAlign:   "left",
                  width:       "100%",
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Content area ── */}
        <div style={S.content}>

          {/* ════ PROFILE TAB ════ */}
          {activeTab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <Section title="Personal Information" subtitle="Update your name, contact details and bio.">
                <FieldRow label="First Name">
                  <input
                    className="input"
                    value={profile.firstName}
                    onChange={(e) => updateProfile("firstName", e.target.value)}
                  />
                </FieldRow>
                <FieldRow label="Last Name">
                  <input
                    className="input"
                    value={profile.lastName}
                    onChange={(e) => updateProfile("lastName", e.target.value)}
                  />
                </FieldRow>
                <FieldRow label="Email Address" hint="Used for login and notifications">
                  <input
                    className="input"
                    type="email"
                    value={profile.email}
                    onChange={(e) => updateProfile("email", e.target.value)}
                  />
                </FieldRow>
                <FieldRow label="Phone Number">
                  <input
                    className="input"
                    value={profile.phone}
                    onChange={(e) => updateProfile("phone", e.target.value)}
                  />
                </FieldRow>
                <FieldRow label="Bio" hint="Brief description about your role">
                  <textarea
                    className="input"
                    rows={3}
                    value={profile.bio}
                    onChange={(e) => updateProfile("bio", e.target.value)}
                    style={{ resize: "vertical", fontFamily: "inherit" }}
                  />
                </FieldRow>
              </Section>

              <Section title="Role & Department" subtitle="Your role assignment — contact IT to change.">
                <FieldRow label="Role">
                  <input className="input" value={profile.role} disabled style={{ background: "#F9FAFB", color: "#6B7280" }} />
                </FieldRow>
                <FieldRow label="Department">
                  <input className="input" value={profile.department} disabled style={{ background: "#F9FAFB", color: "#6B7280" }} />
                </FieldRow>
              </Section>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn-primary" onClick={handleSave}>
                  <Check size={15} /> Save Profile
                </button>
              </div>
            </div>
          )}

          {/* ════ SECURITY TAB ════ */}
          {activeTab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <Section title="Change Password" subtitle="Use a strong password with at least 8 characters.">
                {passError && (
                  <div style={{ background: "#FEF2F2", color: "#991B1B", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 500, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={14} /> {passError}
                  </div>
                )}
                <FieldRow label="Current Password">
                  <div style={{ position: "relative" }}>
                    <input
                      className="input"
                      type={showOld ? "text" : "password"}
                      placeholder="Enter current password"
                      value={passwords.old}
                      onChange={(e) => setPasswords((p) => ({ ...p, old: e.target.value }))}
                      style={{ paddingRight: 44 }}
                    />
                    <button style={S.eyeBtn} onClick={() => setShowOld(!showOld)}>
                      {showOld ? <EyeOff size={15} color="#6B7280" /> : <Eye size={15} color="#6B7280" />}
                    </button>
                  </div>
                </FieldRow>
                <FieldRow label="New Password" hint="Min. 8 characters">
                  <div style={{ position: "relative" }}>
                    <input
                      className="input"
                      type={showNew ? "text" : "password"}
                      placeholder="Enter new password"
                      value={passwords.new}
                      onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
                      style={{ paddingRight: 44 }}
                    />
                    <button style={S.eyeBtn} onClick={() => setShowNew(!showNew)}>
                      {showNew ? <EyeOff size={15} color="#6B7280" /> : <Eye size={15} color="#6B7280" />}
                    </button>
                  </div>
                </FieldRow>
                <FieldRow label="Confirm New Password">
                  <div style={{ position: "relative" }}>
                    <input
                      className="input"
                      type={showConf ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                      style={{ paddingRight: 44 }}
                    />
                    <button style={S.eyeBtn} onClick={() => setShowConf(!showConf)}>
                      {showConf ? <EyeOff size={15} color="#6B7280" /> : <Eye size={15} color="#6B7280" />}
                    </button>
                  </div>
                </FieldRow>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                  <button className="btn-primary" onClick={handlePasswordChange}>
                    <Lock size={14} /> Update Password
                  </button>
                </div>
              </Section>

              <Section title="Active Sessions" subtitle="Devices currently logged into your account.">
                {[
                  { device: "MacBook Pro — Chrome",  location: "Colombo, LK",  time: "Active now",       current: true  },
                  { device: "iPhone 14 — Safari",    location: "Colombo, LK",  time: "2 hours ago",      current: false },
                  { device: "Windows PC — Firefox",  location: "Kandy, LK",    time: "Yesterday 14:30",  current: false },
                ].map((session) => (
                  <div key={session.device} style={S.sessionRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>{session.device}</p>
                        {session.current && (
                          <span style={{ background: "#D1FAE5", color: "#065F46", fontSize: 11, fontWeight: 600, padding: "1px 8px", borderRadius: 20 }}>
                            Current
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                        {session.location} · {session.time}
                      </p>
                    </div>
                    {!session.current && (
                      <button style={S.revokeBtn}>Revoke</button>
                    )}
                  </div>
                ))}
              </Section>

            </div>
          )}

          {/* ════ NOTIFICATIONS TAB ════ */}
          {activeTab === "notifications" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <Section title="Alert Preferences" subtitle="Choose which events trigger notifications.">
                {[
                  { key: "kycAlerts",     label: "KYC Submissions",    hint: "New KYC documents submitted for review"  },
                  { key: "userFlags",     label: "User Flags",          hint: "Users flagged for suspicious activity"   },
                  { key: "adSubmissions", label: "Ad Submissions",      hint: "New lender ads submitted for approval"   },
                  { key: "systemReports", label: "System Reports",      hint: "Automated system performance reports"    },
                  { key: "loginAlerts",   label: "Login Alerts",        hint: "Notify on login from new device or IP"   },
                  { key: "weeklyDigest",  label: "Weekly Digest",       hint: "Weekly summary of platform activity"     },
                ].map((item) => (
                  <div key={item.key} style={S.notifRow}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>{item.label}</p>
                      <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{item.hint}</p>
                    </div>
                    <Toggle
                      checked={notifs[item.key as keyof typeof notifs] as boolean}
                      onChange={(v) => updateNotif(item.key, v)}
                    />
                  </div>
                ))}
              </Section>

              <Section title="Delivery Channels" subtitle="How you receive notifications.">
                {[
                  { key: "emailNotifs",   label: "Email Notifications",   hint: "Receive alerts to admin@smartcredit.com" },
                  { key: "browserNotifs", label: "Browser Notifications",  hint: "Push notifications in the browser"       },
                ].map((item) => (
                  <div key={item.key} style={S.notifRow}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>{item.label}</p>
                      <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{item.hint}</p>
                    </div>
                    <Toggle
                      checked={notifs[item.key as keyof typeof notifs] as boolean}
                      onChange={(v) => updateNotif(item.key, v)}
                    />
                  </div>
                ))}
              </Section>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn-primary" onClick={handleSave}>
                  <Check size={15} /> Save Preferences
                </button>
              </div>

            </div>
          )}

          {/* ════ PLATFORM TAB ════ */}
          {activeTab === "platform" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <Section title="System Controls" subtitle="Platform-wide operational toggles.">

                {/* Maintenance mode — highlighted warning */}
                <div style={{ ...S.notifRow, background: platform.maintenanceMode ? "#FFFBEB" : "transparent", borderRadius: 10, padding: platform.maintenanceMode ? "12px 14px" : "0", marginBottom: platform.maintenanceMode ? 8 : 0, transition: "all 0.2s" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>Maintenance Mode</p>
                      {platform.maintenanceMode && (
                        <span style={{ background: "#FEF3C7", color: "#92400E", fontSize: 11, fontWeight: 600, padding: "1px 8px", borderRadius: 20, display: "flex", alignItems: "center", gap: 3 }}>
                          <AlertTriangle size={10} /> Active
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                      Disables user access while maintenance is performed
                    </p>
                  </div>
                  <Toggle
                    checked={platform.maintenanceMode}
                    onChange={(v) => updatePlatform("maintenanceMode", v)}
                  />
                </div>

                {[
                  { key: "autoKYCReview",    label: "Auto KYC Review",         hint: "Automatically flag low-risk KYC submissions"        },
                  { key: "adAutoApproval",   label: "Ad Auto-Approval",         hint: "Auto-approve ads within interest rate limits"       },
                  { key: "twoFactorEnforce", label: "Enforce 2FA for Admins",   hint: "Require two-factor authentication for all admins"   },
                ].map((item) => (
                  <div key={item.key} style={S.notifRow}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>{item.label}</p>
                      <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{item.hint}</p>
                    </div>
                    <Toggle
                      checked={platform[item.key as keyof typeof platform] as boolean}
                      onChange={(v) => updatePlatform(item.key, v)}
                    />
                  </div>
                ))}
              </Section>

              <Section title="Loan Parameters" subtitle="Platform-wide loan limits and constraints.">
                <FieldRow label="Max Interest Rate (%)" hint="Maximum allowed interest rate for lender ads">
                  <input
                    className="input"
                    type="number"
                    value={platform.maxInterestRate}
                    onChange={(e) => updatePlatform("maxInterestRate", e.target.value)}
                    style={{ maxWidth: 200 }}
                  />
                </FieldRow>
                <FieldRow label="Min Loan Amount (LKR)" hint="Minimum loan amount allowed on the platform">
                  <input
                    className="input"
                    type="number"
                    value={platform.minLoanAmount}
                    onChange={(e) => updatePlatform("minLoanAmount", e.target.value)}
                    style={{ maxWidth: 200 }}
                  />
                </FieldRow>
                <FieldRow label="Max Loan Amount (LKR)" hint="Maximum loan amount allowed on the platform">
                  <input
                    className="input"
                    type="number"
                    value={platform.maxLoanAmount}
                    onChange={(e) => updatePlatform("maxLoanAmount", e.target.value)}
                    style={{ maxWidth: 200 }}
                  />
                </FieldRow>
                <FieldRow label="Session Timeout (min)" hint="Admin session auto-logout after inactivity">
                  <input
                    className="input"
                    type="number"
                    value={platform.sessionTimeout}
                    onChange={(e) => updatePlatform("sessionTimeout", e.target.value)}
                    style={{ maxWidth: 200 }}
                  />
                </FieldRow>
              </Section>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn-primary" onClick={handleSave}>
                  <Check size={15} /> Save Platform Settings
                </button>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Toast */}
      <SaveToast show={toast} />

    </div>
  );
}

// ── Page Styles ───────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  layout: {
    display: "flex",
    gap: 24,
    alignItems: "flex-start",
  },
  tabsSidebar: {
    width: 220,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  adminCard: {
    background: "#FFFFFF",
    borderRadius: 12,
    padding: "20px 16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginBottom: 4,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#007AFF",
    border: "2px solid #FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  notifRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid #F3F4F6",
    gap: 16,
  },
  sessionRow: {
    display: "flex",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #F3F4F6",
    gap: 12,
  },
  revokeBtn: {
    padding: "5px 12px",
    borderRadius: 6,
    border: "1.5px solid #FEE2E2",
    background: "#FEF2F2",
    color: "#EF4444",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

// ── Section styles ────────────────────────────────────────────────────────────
const Se: Record<string, React.CSSProperties> = {
  wrap: {
    background: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  header: {
    padding: "18px 24px",
    borderBottom: "1px solid #F3F4F6",
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1A1A1A",
  },
  sub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },
  body: {
    padding: "4px 24px 16px",
  },
};

// ── Field row styles ──────────────────────────────────────────────────────────
const F: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: 24,
    padding: "14px 0",
    borderBottom: "1px solid #F9FAFB",
  },
  labelCol: {
    width: 180,
    flexShrink: 0,
    paddingTop: 8,
  },
  inputCol: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: "#1A1A1A",
  },
  hint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 3,
    lineHeight: 1.4,
  },
};
