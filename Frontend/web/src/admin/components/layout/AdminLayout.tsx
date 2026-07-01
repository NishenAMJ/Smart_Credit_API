import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

// Wraps the admin shell so the sidebar stays separate from the scrollable content area.
export default function AdminLayout() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
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
          height: "100vh",
        }}
      >
        {/* Outlet renders whichever page is currently active */}
        <Outlet />
      </main>
    </div>
  );
}
