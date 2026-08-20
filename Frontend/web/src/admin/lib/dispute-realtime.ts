import { io, type Socket } from "socket.io-client";
import { getAdminToken } from "./auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

export function subscribeToAdminDisputes(
  onChange: (payload: {
    disputeId: string;
    changeType: string;
    status: string;
    updatedAt: string;
  }) => void,
  onReconnect?: () => void,
): () => void {
  const token = getAdminToken();
  if (!token) return () => undefined;
  const socket: Socket = io(API_BASE_URL.replace(/\/api\/?$/, ""), {
    transports: ["websocket"],
    auth: { token: `Bearer ${token}` },
  });
  socket.on("dispute:changed", onChange);
  socket.io.on("reconnect", () => onReconnect?.());
  return () => socket.disconnect();
}
