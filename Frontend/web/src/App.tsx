import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import SharedAuthPage from "./admin/pages/auth/SharedAuthPage";
import WelcomePage from "./welcome/WelcomePage";

const AdminRoutes = lazy(() => import("./admin/AdminRoutes"));
const LenderApp = lazy(() => import("./lender/App"));

export default function App() {
  return (
    <Suspense
      fallback={
        <main className="app-route-loading" aria-live="polite">
          Loading Smart Credit…
        </main>
      }
    >
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route
          path="/signin"
          element={<SharedAuthPage initialMode="login" />}
        />
        <Route
          path="/signup"
          element={<SharedAuthPage initialMode="register" />}
        />
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="/lender/*" element={<LenderApp />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </Suspense>
  );
}
