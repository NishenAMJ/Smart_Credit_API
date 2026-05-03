import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AdminLayout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#F5F6FA",
      }}
    >
      {/* Sidebar — fixed on the left */}
      <Sidebar />

      {/* Main content area — fills remaining space */}
      <main
        style={{
          flex: 1,
          padding: "28px 32px",
          overflowY: "auto",
          overflowX: "auto",
          minWidth: 0,
        }}
      >
        {/* Outlet renders whichever page is currently active */}
        <Outlet />
      </main>
    </div>
  );
}
