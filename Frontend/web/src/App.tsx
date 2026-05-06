import { Navigate, Route, Routes } from "react-router-dom";
import AdminRoutes from "./admin/AdminRoutes";
import SharedAuthPage from "./admin/pages/auth/SharedAuthPage";
import LenderEntry from "./lender/LenderEntry";

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
      <Route path="/lender/*" element={<LenderEntry />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
