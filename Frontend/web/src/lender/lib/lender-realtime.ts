import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./api-config";

type LenderRealtimeConnection = {
  socket: Socket;
  disconnect: () => void;
};

/**
 * Defers the handshake by one browser task. React Strict Mode can then finish
 * its development-only setup/cleanup probe without opening and immediately
 * aborting a WebSocket connection.
 */
export function createLenderRealtimeConnection(
  accessToken: string,
): LenderRealtimeConnection {
  const socket = io(API_BASE_URL.replace(/\/api\/?$/, ""), {
    autoConnect: false,
    transports: ["websocket"],
    auth: { token: `Bearer ${accessToken}` },
  });
  let disposed = false;
  const connectTimer = window.setTimeout(() => {
    if (!disposed) socket.connect();
  }, 0);

  return {
    socket,
    disconnect: () => {
      disposed = true;
      window.clearTimeout(connectTimer);
      socket.removeAllListeners();
      socket.io.removeAllListeners();
      socket.disconnect();
    },
  };
}
