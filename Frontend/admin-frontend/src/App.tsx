import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layout
import AdminLayout from "./components/layout/AdminLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

// Auth Pages
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import FriendsSignInPage from "./features/auth/pages/FriendsSignInPage";

// Dashboard Pages
import Dashboard from "./pages/dashboard/Dashboard";
import KYCApprovals from "./pages/kyc/KYCApprovals";
import LenderAds from "./pages/lenderAds/LenderAds";
import ManageUsers from "./pages/manageUsers/ManageUsers";
import Analytics from "./pages/analytics/Analytics";
import AuditLogs from "./pages/auditLogs/AuditLogs";
import SettingsPage from "./pages/settings/Settings";
import Disputes from "./pages/disputes/Disputes";
import Transactions from "./pages/transactions/Transactions";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/friends/signin" element={<FriendsSignInPage />} />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/kyc" element={<KYCApprovals />} />
          <Route path="/lender-ads" element={<LenderAds />} />
          <Route path="/manage-users" element={<ManageUsers />} />
          <Route path="/disputes" element={<Disputes />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Default route */}
        <Route path="*" element={<Navigate to="/signin" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
