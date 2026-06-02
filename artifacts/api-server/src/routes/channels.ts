import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, channelsTable, membersTable, messagesTable, usersTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function fmtUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...rest } = u;
  return rest;
}

router.get("/servers/:serverId/channels", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const channels = await db.select().from(channelsTable)
    .where(eq(channelsTable.serverId, serverId));
  res.json(channels);
});

router.post("/servers/:serverId/channels", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const { name, type, topic, parentId, position, slowmode } = req.body;
  if (!name || !type) { res.status(400).json({ error: "Name and type required" }); return; }
  const [ch] = await db.insert(channelsTable).values({
    serverId, name, type, topic, parentId, position: position ?? 0, slowmode: slowmode ?? 0,
  }).returning();
  res.status(201).json(ch);
});

router.get("/channels/:channelId", requireAuth, async (req, res): Promise<void> => {
  const channelId = parseId(req.params.channelId);
  const [ch] = await db.select().from(channelsTable).where(eq(channelsTable.id, channelId));
  if (!ch) { res.status(404).json({ error: "Not found" }); return; }
  res.json(ch);
});

router.patch("/channels/:channelId", requireAuth, async (req, res): Promise<void> => {
  const channelId = parseId(req.params.channelId);
  const { name, topic, position, slowmode, nsfw, parentId } = req.body;
  const [ch] = await db.update(channelsTable)
    .set({ name, topic, position, slowmode, nsfw, parentId })
    .where(eq(channelsTable.id, channelId))
    .returning();
  if (!ch) { res.status(404).json({ error: "Not found" }); return; }
  res.json(ch);
});

router.delete("/channels/:channelId", requireAuth, async (req, res): Promise<void> => {
  const channelId = parseId(req.params.channelId);
  await db.delete(channelsTable).where(eq(channelsTable.id, channelId));
  res.json({ success: true });
});

router.get("/channels/:channelId/pins", requireAuth, async (req, res): Promise<void> => {
  const channelId = parseId(req.params.channelId);
  const messages = await db.select().from(messagesTable)
    .where(and(eq(messagesTable.channelId, channelId), eq(messagesTable.isPinned, true)));
  const withAuthors = await Promise.all(messages.map(async (m) => {
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, m.authorId));
    return { ...m, author: author ? fmtUser(author) : null, attachments: m.attachments ?? [], reactions: m.reactions ?? [], embeds: m.embeds ?? [], mentions: m.mentions ?? [] };
  }));
  res.json(withAuthors);
});

export default router;
