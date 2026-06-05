import { Router, type IRouter } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db, usersTable, serversTable, messagesTable, channelsTable, membersTable, friendshipsTable, dmChannelsTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function fmtUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...rest } = u;
  return rest;
}

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map(fmtUser));
});

router.delete("/admin/users/:userId", requireAdmin, async (req, res): Promise<void> => {
  const userId = parseId(req.params.userId);
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.json({ success: true });
});

router.get("/admin/servers", requireAdmin, async (_req, res): Promise<void> => {
  const servers = await db.select().from(serversTable).orderBy(desc(serversTable.createdAt));
  const withCounts = await Promise.all(servers.map(async (s) => {
    const [mc] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.serverId, s.id));
    const [cc] = await db.select({ count: count() }).from(channelsTable).where(eq(channelsTable.serverId, s.id));
    return { ...s, memberCount: Number(mc.count), channelCount: Number(cc.count) };
  }));
  res.json(withCounts);
});

router.delete("/admin/servers/:serverId", requireAdmin, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  await db.delete(serversTable).where(eq(serversTable.id, serverId));
  res.json({ success: true });
});

router.delete("/admin/messages/:messageId", requireAdmin, async (req, res): Promise<void> => {
  const messageId = parseId(req.params.messageId);
  await db.delete(messagesTable).where(eq(messagesTable.id, messageId));
  const io = (req.app as { io?: { to: (r: string) => { emit: (e: string, d: unknown) => void } } }).io;
  // Note: we don't know channelId here without fetching first
  io?.to(`admin:messages`).emit("message:admin-delete", { id: messageId });
  res.json({ success: true });
});

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [userCount] = await db.select({ count: count() }).from(usersTable);
  const [serverCount] = await db.select({ count: count() }).from(serversTable);
  const [channelCount] = await db.select({ count: count() }).from(channelsTable);
  const [messageCount] = await db.select({ count: count() }).from(messagesTable);
  const [dmCount] = await db.select({ count: count() }).from(dmChannelsTable);
  const [friendCount] = await db.select({ count: count() }).from(friendshipsTable);
  const adminCount = (await db.select().from(usersTable).where(eq(usersTable.isAdmin, true))).length;

  res.json({
    users: Number(userCount.count),
    servers: Number(serverCount.count),
    channels: Number(channelCount.count),
    messages: Number(messageCount.count),
    dms: Number(dmCount.count),
    friendships: Number(friendCount.count),
    admins: adminCount,
  });
});

export default router;
