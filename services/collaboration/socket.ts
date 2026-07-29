import { io, Socket } from "socket.io-client";
import { getCurrentUser } from "../authService";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    // Connect to backend (typically on port 3000 in dev, or origin in prod)
    const socketUrl = window.location.origin.includes("5173")
      ? window.location.origin.replace("5173", "3000")
      : window.location.origin;

    socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      // `auth` as a function is re-invoked by socket.io-client on every
      // (re)connection attempt, so it always sends the freshest token —
      // this covers the case where the socket module is first imported
      // (and connects) before the user has logged in: the initial
      // handshake will be rejected by the server's auth middleware, and
      // socket.io's built-in reconnection logic will retry with the
      // token once the user logs in.
      auth: (cb) => cb({ token: getCurrentUser()?.token })
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connection error:", err.message);
    });
  }
  return socket;
};

/**
 * Forces the existing socket to re-authenticate immediately, e.g. right
 * after login/logout, instead of waiting for the next automatic
 * reconnection attempt to pick up the new token.
 */
export const reauthSocket = (): void => {
  if (socket) {
    socket.disconnect().connect();
  }
};
