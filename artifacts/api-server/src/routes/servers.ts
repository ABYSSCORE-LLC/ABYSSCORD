import { Router, type IRouter } from "express";
import { eq, and, count, ilike } from "drizzle-orm";
import { db, serversTable, membersTable, channelsTable, rolesTable, usersTable, messagesTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function fmtUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...rest } = u;
  return rest;
}

async function getServerWithDetails(serverId: number) {
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));
  if (!server) return null;
  const channels = await db.select().from(channelsTable).where(eq(channelsTable.serverId, serverId));
  const roles = await db.select().from(rolesTable).where(eq(rolesTable.serverId, serverId));
  const [memberCount] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.serverId, serverId));
  return { ...server, channels, roles, memberCount: Number(memberCount.count) };
}

router.get("/servers", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const memberRows = await db.select().from(membersTable).where(eq(membersTable.userId, userId));
  const serverIds = memberRows.map(m => m.serverId);
  if (serverIds.length === 0) { res.json([]); return; }
  const servers = await Promise.all(serverIds.map(async (sid) => {
    const [s] = await db.select().from(serversTable).where(eq(serversTable.id, sid));
    const [mc] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.serverId, sid));
    return s ? { ...s, memberCount: Number(mc.count) } : null;
  }));
  res.json(servers.filter(Boolean));
});

router.get("/servers/discover", requireAuth, async (req, res): Promise<void> => {
  const q = req.query.q as string | undefined;
  const limit = parseInt(req.query.limit as string ?? "20", 10);
  let rows;
  if (q) {
    rows = await db.select().from(serversTable).where(and(eq(serversTable.isPublic, true), ilike(serversTable.name, `%${q}%`))).limit(limit);
  } else {
    rows = await db.select().from(serversTable).where(eq(serversTable.isPublic, true)).limit(limit);
  }
  const servers = await Promise.all(rows.map(async (s) => {
    const [mc] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.serverId, s.id));
    return { ...s, memberCount: Number(mc.count) };
  }));
  res.json(servers);
});

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

router.post("/servers", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const { name, description, iconUrl, isPublic } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Name is required" }); return;
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    res.status(400).json({ error: "Server name must be between 2 and 100 characters" }); return;
  }

  const inviteCode = generateInviteCode();
  const [server] = await db.insert(serversTable).values({
    name: trimmed, description, iconUrl, inviteCode, isPublic: isPublic ?? false, ownerId: userId,
  }).returning();

  // Auto-create general channel
  await db.insert(channelsTable).values({ serverId: server.id, name: "general", type: "text", position: 0 });
  // Auto-create @everyone role
  await db.insert(rolesTable).values({ serverId: server.id, name: "@everyone", color: "#99aab5", position: 0, permissions: 104324673 });
  // Auto-create Admin role
  const [adminRole] = await db.insert(rolesTable).values({
    serverId: server.id, name: "Admin", color: "#ED4245", position: 1, permissions: 2147483647, hoist: true,
  }).returning();
  // Join as owner with Admin role
  await db.insert(membersTable).values({ userId, serverId: server.id, roles: [adminRole.id] });

  res.status(201).json({ ...server, memberCount: 1 });
});

router.get("/servers/:serverId", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const detail = await getServerWithDetails(serverId);
  if (!detail) { res.status(404).json({ error: "Server not found" }); return; }
  res.json(detail);
});

router.patch("/servers/:serverId", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const userId = getUserId(req);
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));
  if (!server) { res.status(404).json({ error: "Not found" }); return; }
  if (server.ownerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, description, iconUrl, bannerUrl, isPublic, vanityUrl, verificationLevel } = req.body;
  const [updated] = await db.update(serversTable).set({
    name, description, iconUrl, bannerUrl, isPublic, vanityUrl, verificationLevel
  }).where(eq(serversTable.id, serverId)).returning();
  res.json(updated);
});

router.delete("/servers/:serverId", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const userId = getUserId(req);
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));
  if (!server || server.ownerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(serversTable).where(eq(serversTable.id, serverId));
  res.json({ success: true });
});

router.post("/servers/:serverId/leave", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const userId = getUserId(req);
  await db.delete(membersTable).where(and(eq(membersTable.serverId, serverId), eq(membersTable.userId, userId)));
  res.json({ success: true });
});

router.get("/servers/:serverId/summary", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));
  if (!server) { res.status(404).json({ error: "Not found" }); return; }
  const [mc] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.serverId, serverId));
  const channels = await db.select().from(channelsTable).where(eq(channelsTable.serverId, serverId));
  let totalMessages = 0;
  for (const ch of channels) {
    const [msgCount] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.channelId, ch.id));
    totalMessages += Number(msgCount.count);
  }
  res.json({
    serverId,
    onlineCount: Math.floor(Number(mc.count) * 0.4),
    totalMembers: Number(mc.count),
    totalMessages,
    boostLevel: server.boostLevel,
    boostCount: server.boostCount,
  });
});

export default router;
