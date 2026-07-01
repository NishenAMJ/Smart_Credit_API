import { Navigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
}

// Protects admin routes until a valid admin session is present.
export default function ProtectedRoute({ children }: Props) {
  const token = localStorage.getItem("adminToken");

  // If no token found, redirect to Sign In
  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  // If token exists, render the page normally
  return <>{children}</>;
}
