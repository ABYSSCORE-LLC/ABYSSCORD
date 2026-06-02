import { Router, type IRouter } from "express";
import { eq, and, or } from "drizzle-orm";
import { db, friendshipsTable, usersTable } from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function fmtUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...rest } = u;
  return rest;
}

router.get("/friends", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rows = await db.select().from(friendshipsTable)
    .where(or(eq(friendshipsTable.userId, userId), eq(friendshipsTable.friendId, userId)));

  const friends: ReturnType<typeof fmtUser>[] = [];
  const incoming: ReturnType<typeof fmtUser>[] = [];
  const outgoing: ReturnType<typeof fmtUser>[] = [];
  const blocked: ReturnType<typeof fmtUser>[] = [];

  for (const r of rows) {
    const otherId = r.userId === userId ? r.friendId : r.userId;
    const [other] = await db.select().from(usersTable).where(eq(usersTable.id, otherId));
    if (!other) continue;
    if (r.status === "accepted") friends.push(fmtUser(other));
    else if (r.status === "pending" && r.friendId === userId) incoming.push(fmtUser(other));
    else if (r.status === "pending" && r.userId === userId) outgoing.push(fmtUser(other));
    else if (r.status === "blocked") blocked.push(fmtUser(other));
  }

  res.json({ friends, incoming, outgoing, blocked });
});

router.post("/friends/add", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const { username } = req.body;
  if (!username) { res.status(400).json({ error: "Username required" }); return; }
  const [target] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target.id === userId) { res.status(400).json({ error: "Cannot add yourself" }); return; }
  await db.insert(friendshipsTable).values({ userId, friendId: target.id, status: "pending" });
  res.json({ success: true });
});

router.post("/friends/:userId/accept", requireAuth, async (req, res): Promise<void> => {
  const me = getUserId(req);
  const friendId = parseId(req.params.userId);
  await db.update(friendshipsTable)
    .set({ status: "accepted" })
    .where(and(eq(friendshipsTable.userId, friendId), eq(friendshipsTable.friendId, me)));
  res.json({ success: true });
});

router.post("/friends/:userId/decline", requireAuth, async (req, res): Promise<void> => {
  const me = getUserId(req);
  const friendId = parseId(req.params.userId);
  await db.delete(friendshipsTable)
    .where(and(eq(friendshipsTable.userId, friendId), eq(friendshipsTable.friendId, me)));
  res.json({ success: true });
});

router.delete("/friends/:userId", requireAuth, async (req, res): Promise<void> => {
  const me = getUserId(req);
  const friendId = parseId(req.params.userId);
  await db.delete(friendshipsTable)
    .where(or(
      and(eq(friendshipsTable.userId, me), eq(friendshipsTable.friendId, friendId)),
      and(eq(friendshipsTable.userId, friendId), eq(friendshipsTable.friendId, me))
    ));
  res.json({ success: true });
});

router.post("/friends/:userId/block", requireAuth, async (req, res): Promise<void> => {
  const me = getUserId(req);
  const targetId = parseId(req.params.userId);
  await db.delete(friendshipsTable).where(
    or(
      and(eq(friendshipsTable.userId, me), eq(friendshipsTable.friendId, targetId)),
      and(eq(friendshipsTable.userId, targetId), eq(friendshipsTable.friendId, me))
    )
  );
  await db.insert(friendshipsTable).values({ userId: me, friendId: targetId, status: "blocked" });
  res.json({ success: true });
});

export default router;
