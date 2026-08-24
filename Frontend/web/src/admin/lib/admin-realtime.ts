import { io, type Socket } from "socket.io-client";
import { getAdminToken } from "./auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

export type AdminChangedPayload = {
  resource: "users" | "kyc" | "ads" | "audit" | "transactions";
  entityId: string;
  changeType: string;
  updatedAt: string;
};

export function subscribeToAdminChanges(
  resources: AdminChangedPayload["resource"][],
  refresh: () => void,
): () => void {
  // ADMIN: Listen for new items - refreshes a page after a matching real-time event.
  const token = getAdminToken();
  if (!token) return () => undefined;
  let timer: number | undefined;
  const schedule = () => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(refresh, 400);
  };
  const socket: Socket = io(API_BASE_URL.replace(/\/api\/?$/, ""), {
    transports: ["websocket"],
    auth: { token: `Bearer ${token}` },
  });
  socket.on("admin:changed", (payload: AdminChangedPayload) => {
    // Refresh only when the changed resource belongs to the current page.
    if (resources.includes(payload.resource)) schedule();
  });
  socket.io.on("reconnect", schedule);
  return () => {
    if (timer) window.clearTimeout(timer);
    socket.disconnect();
  };
}
