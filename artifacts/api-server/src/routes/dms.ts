import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, dmChannelsTable, dmParticipantsTable, dmMessagesTable, usersTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function fmtUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...rest } = u;
  return rest;
}

async function getDMWithParticipants(dmId: number) {
  const [dm] = await db.select().from(dmChannelsTable).where(eq(dmChannelsTable.id, dmId));
  if (!dm) return null;
  const participants = await db.select().from(dmParticipantsTable).where(eq(dmParticipantsTable.dmId, dmId));
  const users = await Promise.all(participants.map(async (p) => {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, p.userId));
    return u ? fmtUser(u) : null;
  }));
  return { ...dm, participants: users.filter(Boolean) };
}

router.get("/dms", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const participations = await db.select().from(dmParticipantsTable).where(eq(dmParticipantsTable.userId, userId));
  const dms = await Promise.all(participations.map(p => getDMWithParticipants(p.dmId)));
  res.json(dms.filter(Boolean));
});

router.post("/dms", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const { recipientId } = req.body;
  if (!recipientId) { res.status(400).json({ error: "recipientId required" }); return; }

  // Check if DM already exists
  const myDMs = await db.select().from(dmParticipantsTable).where(eq(dmParticipantsTable.userId, userId));
  for (const p of myDMs) {
    const others = await db.select().from(dmParticipantsTable).where(eq(dmParticipantsTable.dmId, p.dmId));
    const isMatch = others.some(o => o.userId === recipientId) && others.length === 2;
    if (isMatch) {
      const dm = await getDMWithParticipants(p.dmId);
      res.json(dm);
      return;
    }
  }

  const [dm] = await db.insert(dmChannelsTable).values({ type: "dm" }).returning();
  await db.insert(dmParticipantsTable).values([
    { dmId: dm.id, userId },
    { dmId: dm.id, userId: recipientId },
  ]);
  res.json(await getDMWithParticipants(dm.id));
});

router.get("/dms/:dmId/messages", requireAuth, async (req, res): Promise<void> => {
  const dmId = parseId(req.params.dmId);
  const messages = await db.select().from(dmMessagesTable)
    .where(eq(dmMessagesTable.dmId, dmId))
    .orderBy(desc(dmMessagesTable.createdAt))
    .limit(50);
  const withAuthors = await Promise.all(messages.reverse().map(async (m) => {
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, m.authorId));
    return { ...m, channelId: m.dmId, author: author ? fmtUser(author) : null, attachments: [], reactions: [], embeds: [], mentions: [], mentionsEveryone: false, replyTo: null, isPinned: false, replyToId: null };
  }));
  res.json(withAuthors);
});

router.post("/dms/:dmId/messages", requireAuth, async (req, res): Promise<void> => {
  const dmId = parseId(req.params.dmId);
  const userId = getUserId(req);
  const { content } = req.body;
  if (!content?.trim()) { res.status(400).json({ error: "Content required" }); return; }
  await db.update(dmChannelsTable).set({ lastMessageAt: new Date() }).where(eq(dmChannelsTable.id, dmId));
  const [msg] = await db.insert(dmMessagesTable).values({ dmId, authorId: userId, content }).returning();
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const formatted = { ...msg, channelId: dmId, author: author ? fmtUser(author) : null, attachments: [], reactions: [], embeds: [], mentions: [], mentionsEveryone: false, replyTo: null, isPinned: false, replyToId: null };
  const io = (req.app as { io?: { to: (r: string) => { emit: (e: string, d: unknown) => void } } }).io;
  io?.to(`dm:${dmId}`).emit("message:new", formatted);
  res.status(201).json(formatted);
});

export default router;
