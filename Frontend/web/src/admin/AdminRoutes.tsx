import { Navigate, Route, Routes } from "react-router-dom";
import "./index.css";

import AdminLayout from "./components/layout/AdminLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import KYCApprovals from "./pages/kyc/KYCApprovals";
import LenderAds from "./pages/lenderAds/LenderAds";
import ManageUsers from "./pages/manageUsers/ManageUsers";
import Analytics from "./pages/analytics/Analytics";
import AuditLogs from "./pages/auditLogs/AuditLogs";
import SettingsPage from "./pages/settings/Settings";
import Disputes from "./pages/disputes/Disputes";
import Transactions from "./pages/transactions/Transactions";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";

function ProtectedAdminLayout() {
  const token = localStorage.getItem("adminToken");

  if (!token) {
    return <Navigate to="/admin/signin" replace />;
  }

  return <AdminLayout />;
}

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="signin" element={<SignIn />} />
      <Route path="signup" element={<SignUp />} />
      <Route element={<ProtectedAdminLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="kyc" element={<KYCApprovals />} />
        <Route path="lender-ads" element={<LenderAds />} />
        <Route path="manage-users" element={<ManageUsers />} />
        <Route path="disputes" element={<Disputes />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="signin" replace />} />
    </Routes>
  );
}
