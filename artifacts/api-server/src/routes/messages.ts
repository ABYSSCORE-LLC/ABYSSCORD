import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, messagesTable, usersTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function fmtUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...rest } = u;
  return rest;
}

async function formatMessage(m: typeof messagesTable.$inferSelect) {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, m.authorId));
  let replyTo = null;
  if (m.replyToId) {
    const [rm] = await db.select().from(messagesTable).where(eq(messagesTable.id, m.replyToId));
    if (rm) {
      const [rmAuthor] = await db.select().from(usersTable).where(eq(usersTable.id, rm.authorId));
      replyTo = { id: rm.id, authorId: rm.authorId, content: rm.content, author: rmAuthor ? fmtUser(rmAuthor) : null };
    }
  }
  return {
    ...m,
    author: author ? fmtUser(author) : null,
    replyTo,
    attachments: (m.attachments as unknown[]) ?? [],
    reactions: (m.reactions as unknown[]) ?? [],
    embeds: (m.embeds as unknown[]) ?? [],
    mentions: m.mentions ?? [],
  };
}

router.get("/channels/:channelId/messages", requireAuth, async (req, res): Promise<void> => {
  const channelId = parseId(req.params.channelId);
  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.channelId, channelId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(50);
  const formatted = await Promise.all(messages.reverse().map(formatMessage));
  res.json(formatted);
});

router.post("/channels/:channelId/messages", requireAuth, async (req, res): Promise<void> => {
  const channelId = parseId(req.params.channelId);
  const userId = getUserId(req);
  const { content, replyToId, attachments, mentions, mentionsEveryone } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "Content required" }); return; }
  const [msg] = await db.insert(messagesTable).values({
    channelId,
    authorId: userId,
    content,
    replyToId,
    attachments: attachments ?? [],
    mentions: mentions ?? [],
    mentionsEveryone: mentionsEveryone ?? false,
  }).returning();
  const formatted = await formatMessage(msg);
  // Emit via socket (attached to req.app)
  const io = (req.app as { io?: { to: (r: string) => { emit: (e: string, d: unknown) => void } } }).io;
  io?.to(`channel:${channelId}`).emit("message:new", formatted);
  res.status(201).json(formatted);
});

router.patch("/messages/:messageId", requireAuth, async (req, res): Promise<void> => {
  const messageId = parseId(req.params.messageId);
  const userId = getUserId(req);
  const { content } = req.body;
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }
  if (msg.authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const [updated] = await db.update(messagesTable)
    .set({ content, editedAt: new Date() })
    .where(eq(messagesTable.id, messageId))
    .returning();
  const formatted = await formatMessage(updated);
  const io = (req.app as { io?: { to: (r: string) => { emit: (e: string, d: unknown) => void } } }).io;
  io?.to(`channel:${msg.channelId}`).emit("message:update", formatted);
  res.json(formatted);
});

router.delete("/messages/:messageId", requireAuth, async (req, res): Promise<void> => {
  const messageId = parseId(req.params.messageId);
  const userId = getUserId(req);
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }
  if (msg.authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(messagesTable).where(eq(messagesTable.id, messageId));
  const io = (req.app as { io?: { to: (r: string) => { emit: (e: string, d: unknown) => void } } }).io;
  io?.to(`channel:${msg.channelId}`).emit("message:delete", { id: messageId, channelId: msg.channelId });
  res.json({ success: true });
});

router.post("/messages/:messageId/pin", requireAuth, async (req, res): Promise<void> => {
  const messageId = parseId(req.params.messageId);
  await db.update(messagesTable).set({ isPinned: true }).where(eq(messagesTable.id, messageId));
  res.json({ success: true });
});

router.delete("/messages/:messageId/pin", requireAuth, async (req, res): Promise<void> => {
  const messageId = parseId(req.params.messageId);
  await db.update(messagesTable).set({ isPinned: false }).where(eq(messagesTable.id, messageId));
  res.json({ success: true });
});

router.post("/messages/:messageId/reactions/:emoji", requireAuth, async (req, res): Promise<void> => {
  const messageId = parseId(req.params.messageId);
  const userId = getUserId(req);
  const emoji = decodeURIComponent(Array.isArray(req.params.emoji) ? req.params.emoji[0] : req.params.emoji);
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }
  const reactions = (msg.reactions as Array<{ emoji: string; count: number; userIds: number[] }>) ?? [];
  const existing = reactions.find(r => r.emoji === emoji);
  if (existing) {
    if (!existing.userIds.includes(userId)) {
      existing.userIds.push(userId);
      existing.count++;
    }
  } else {
    reactions.push({ emoji, count: 1, userIds: [userId] });
  }
  await db.update(messagesTable).set({ reactions }).where(eq(messagesTable.id, messageId));
  res.json({ success: true });
});

router.delete("/messages/:messageId/reactions/:emoji", requireAuth, async (req, res): Promise<void> => {
  const messageId = parseId(req.params.messageId);
  const userId = getUserId(req);
  const emoji = decodeURIComponent(Array.isArray(req.params.emoji) ? req.params.emoji[0] : req.params.emoji);
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }
  const reactions = (msg.reactions as Array<{ emoji: string; count: number; userIds: number[] }>) ?? [];
  const updated = reactions.map(r => {
    if (r.emoji === emoji) {
      return { ...r, userIds: r.userIds.filter(id => id !== userId), count: r.count - 1 };
    }
    return r;
  }).filter(r => r.count > 0);
  await db.update(messagesTable).set({ reactions: updated }).where(eq(messagesTable.id, messageId));
  res.json({ success: true });
});

router.get("/channels/:channelId/search", requireAuth, async (req, res): Promise<void> => {
  const channelId = parseId(req.params.channelId);
  const q = (req.query.q as string) ?? "";
  const { ilike } = await import("drizzle-orm");
  const messages = await db.select().from(messagesTable)
    .where(ilike(messagesTable.content, `%${q}%`))
    .limit(25);
  const formatted = await Promise.all(messages.map(formatMessage));
  res.json(formatted);
});

export default router;
