import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./index.css";

import AdminLayout from "./components/layout/AdminLayout";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";

const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const KYCApprovals = lazy(() => import("./pages/kyc/KYCApprovals"));
const LenderAds = lazy(() => import("./pages/lenderAds/LenderAds"));
const ManageUsers = lazy(() => import("./pages/manageUsers/ManageUsers"));
const Analytics = lazy(() => import("./pages/analytics/Analytics"));
const AuditLogs = lazy(() => import("./pages/auditLogs/AuditLogs"));
const SettingsPage = lazy(() => import("./pages/settings/Settings"));
const Disputes = lazy(() => import("./pages/disputes/Disputes"));
const Transactions = lazy(() => import("./pages/transactions/Transactions"));
const LegalAgreements = lazy(
  () => import("./pages/agreements/LegalAgreements"),
);

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
        <Route path="agreements" element={<LegalAgreements />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="signin" replace />} />
    </Routes>
  );
}
