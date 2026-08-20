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
  let timer: number | undefined;
  let latestPayload: Parameters<typeof onChange>[0] | undefined;
  const schedule = (reconnect = false) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (reconnect) onReconnect?.();
      else if (latestPayload) onChange(latestPayload);
    }, 400);
  };
  const socket: Socket = io(API_BASE_URL.replace(/\/api\/?$/, ""), {
    transports: ["websocket"],
    auth: { token: `Bearer ${token}` },
  });
  socket.on("dispute:changed", (payload) => {
    latestPayload = payload;
    schedule();
  });
  socket.io.on("reconnect", () => schedule(true));
  return () => {
    if (timer) window.clearTimeout(timer);
    socket.disconnect();
  };
}
