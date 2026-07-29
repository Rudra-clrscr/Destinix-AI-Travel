import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "../services/db";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

/**
 * Connection-level auth middleware, mirrors the REST `authenticate` middleware
 * (server/collaboration/middleware/authenticate.ts). Clients must pass their JWT
 * via `socket.handshake.auth.token`. Connections without a valid, verifiable
 * token for an existing user are rejected before any event handlers run.
 */
const authenticateSocket = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const payload = jwt.verify(token, JWT_SECRET) as {
      email: string;
      id?: string;
      exp: number;
    };

    if (!payload.email) {
      return next(new Error("Authentication error: Token does not contain user email"));
    }

    const user = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() }
    });

    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    socket.data.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new Error("Authentication error: Token expired"));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new Error("Authentication error: Invalid token signature"));
    }
    console.error("Socket auth middleware error:", err);
    return next(new Error("Authentication error: Authentication failed"));
  }
};

export const initSocket = (io: Server) => {
  io.use(authenticateSocket);

  io.on("connection", (socket: Socket) => {
    console.log(
      "Real-time collaboration: client connected, socket id =",
      socket.id,
      "user =",
      socket.data.user?.email
    );

    // Join a room specific to a TripGroup, but only if the authenticated
    // user is actually a member of that group.
    socket.on("group:join", async (groupId: string) => {
      try {
        if (!groupId) {
          socket.emit("group:join:error", { error: "Group ID is required" });
          return;
        }

        const userId = socket.data.user?.id;
        if (!userId) {
          socket.emit("group:join:error", { groupId, error: "Unauthorized. User context missing." });
          return;
        }

        const membership = await prisma.tripMember.findFirst({
          where: {
            tripGroupId: groupId,
            userId
          }
        });

        if (!membership) {
          socket.emit("group:join:error", {
            groupId,
            error: "Access denied. You are not a member of this group."
          });
          return;
        }

        socket.join(groupId);
        console.log(`Socket ${socket.id} joined TripGroup room ${groupId}`);
        socket.emit("group:joined", { groupId });
      } catch (err) {
        console.error("group:join error:", err);
        socket.emit("group:join:error", { groupId, error: "Internal server error checking membership" });
      }
    });

    socket.on("disconnect", () => {
      console.log("Real-time collaboration: client disconnected, socket id =", socket.id);
    });
  });
};
