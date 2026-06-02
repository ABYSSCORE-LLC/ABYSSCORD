import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { verifyToken } from "./lib/auth";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/api/socket.io",
});

// Attach io to app for use in route handlers
(app as typeof app & { io: typeof io }).io = io;

io.use((socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) { next(new Error("No token")); return; }
  const payload = verifyToken(token);
  if (!payload) { next(new Error("Invalid token")); return; }
  (socket as typeof socket & { userId: number }).userId = payload.sub;
  next();
});

io.on("connection", (socket) => {
  const userId = (socket as typeof socket & { userId: number }).userId;
  logger.info({ userId, socketId: socket.id }, "Socket connected");

  socket.join(`user:${userId}`);

  socket.on("channel:join", (channelId: number) => {
    socket.join(`channel:${channelId}`);
  });

  socket.on("channel:leave", (channelId: number) => {
    socket.leave(`channel:${channelId}`);
  });

  socket.on("dm:join", (dmId: number) => {
    socket.join(`dm:${dmId}`);
  });

  socket.on("typing:start", ({ channelId }: { channelId: number }) => {
    socket.to(`channel:${channelId}`).emit("typing:start", { channelId, userId });
  });

  socket.on("typing:stop", ({ channelId }: { channelId: number }) => {
    socket.to(`channel:${channelId}`).emit("typing:stop", { channelId, userId });
  });

  socket.on("disconnect", () => {
    logger.info({ userId, socketId: socket.id }, "Socket disconnected");
  });
});

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
