import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, invitesTable, serversTable, membersTable, usersTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function fmtUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...rest } = u;
  return rest;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

router.get("/servers/:serverId/invites", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const invites = await db.select().from(invitesTable).where(eq(invitesTable.serverId, serverId));
  const withExtras = await Promise.all(invites.map(async (inv) => {
    const [server] = await db.select().from(serversTable).where(eq(serversTable.id, inv.serverId));
    const [inviter] = await db.select().from(usersTable).where(eq(usersTable.id, inv.inviterId));
    return { ...inv, server, inviter: inviter ? fmtUser(inviter) : null };
  }));
  res.json(withExtras);
});

router.post("/servers/:serverId/invites", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const userId = getUserId(req);
  const { channelId, maxUses, expiresInHours } = req.body;
  const code = generateCode();
  const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3600000) : null;
  const [invite] = await db.insert(invitesTable).values({
    code, serverId, channelId, inviterId: userId, maxUses, expiresAt,
  }).returning();
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));
  const [inviter] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.status(201).json({ ...invite, server, inviter: inviter ? fmtUser(inviter) : null });
});

router.get("/invites/:code", requireAuth, async (req, res): Promise<void> => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  const [invite] = await db.select().from(invitesTable).where(eq(invitesTable.code, code));
  if (!invite) { res.status(404).json({ error: "Invalid invite" }); return; }
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, invite.serverId));
  const [inviter] = await db.select().from(usersTable).where(eq(usersTable.id, invite.inviterId));
  res.json({ ...invite, server, inviter: inviter ? fmtUser(inviter) : null });
});

router.post("/invites/:code/use", requireAuth, async (req, res): Promise<void> => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  const userId = getUserId(req);
  const [invite] = await db.select().from(invitesTable).where(eq(invitesTable.code, code));
  if (!invite) { res.status(404).json({ error: "Invalid invite" }); return; }
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    res.status(400).json({ error: "Invite expired" }); return;
  }
  // Join server
  const existing = await db.select().from(membersTable)
    .where(eq(membersTable.userId, userId));
  const alreadyMember = existing.some(m => m.serverId === invite.serverId);
  if (!alreadyMember) {
    await db.insert(membersTable).values({ userId, serverId: invite.serverId });
    await db.update(invitesTable).set({ uses: invite.uses + 1 }).where(eq(invitesTable.code, code));
  }
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, invite.serverId));
  res.json(server);
});

export default router;
