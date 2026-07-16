import { Navigate, Route, Routes } from "react-router-dom";
import AdminRoutes from "./admin/AdminRoutes";
import SharedAuthPage from "./admin/pages/auth/SharedAuthPage";
import LenderApp from "./lender/App";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SharedAuthPage initialMode="login" />} />
      <Route path="/signin" element={<SharedAuthPage initialMode="login" />} />
      <Route
        path="/signup"
        element={<SharedAuthPage initialMode="register" />}
      />
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/lender/*" element={<LenderApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
