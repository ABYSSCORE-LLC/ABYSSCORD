import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, membersTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function fmtUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...rest } = u;
  return rest;
}

router.get("/servers/:serverId/members", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const members = await db.select().from(membersTable).where(eq(membersTable.serverId, serverId));
  const withUsers = await Promise.all(members.map(async (m) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId));
    return { ...m, user: user ? fmtUser(user) : null };
  }));
  res.json(withUsers);
});

router.patch("/servers/:serverId/members/:userId", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const userId = parseId(req.params.userId);
  const { nickname, roles } = req.body;
  const [updated] = await db.update(membersTable)
    .set({ nickname, roles })
    .where(and(eq(membersTable.serverId, serverId), eq(membersTable.userId, userId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Member not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.json({ ...updated, user: user ? fmtUser(user) : null });
});

router.delete("/servers/:serverId/members/:userId", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const userId = parseId(req.params.userId);
  await db.delete(membersTable).where(and(eq(membersTable.serverId, serverId), eq(membersTable.userId, userId)));
  res.json({ success: true });
});

router.post("/servers/:serverId/bans/:userId", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const userId = parseId(req.params.userId);
  await db.delete(membersTable).where(and(eq(membersTable.serverId, serverId), eq(membersTable.userId, userId)));
  res.json({ success: true });
});

router.delete("/servers/:serverId/bans/:userId", requireAuth, async (req, res): Promise<void> => {
  res.json({ success: true });
});

export default router;
