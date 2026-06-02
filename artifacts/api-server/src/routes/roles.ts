import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, rolesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/servers/:serverId/roles", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const roles = await db.select().from(rolesTable).where(eq(rolesTable.serverId, serverId));
  res.json(roles);
});

router.post("/servers/:serverId/roles", requireAuth, async (req, res): Promise<void> => {
  const serverId = parseId(req.params.serverId);
  const { name, color, hoist, mentionable, permissions } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [role] = await db.insert(rolesTable).values({
    serverId, name, color: color ?? "#99aab5", hoist: hoist ?? false,
    mentionable: mentionable ?? false, permissions: permissions ?? 0,
  }).returning();
  res.status(201).json(role);
});

router.patch("/servers/:serverId/roles/:roleId", requireAuth, async (req, res): Promise<void> => {
  const roleId = parseId(req.params.roleId);
  const { name, color, hoist, mentionable, permissions, position } = req.body;
  const [role] = await db.update(rolesTable)
    .set({ name, color, hoist, mentionable, permissions, position })
    .where(eq(rolesTable.id, roleId))
    .returning();
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  res.json(role);
});

router.delete("/servers/:serverId/roles/:roleId", requireAuth, async (req, res): Promise<void> => {
  const roleId = parseId(req.params.roleId);
  await db.delete(rolesTable).where(eq(rolesTable.id, roleId));
  res.json({ success: true });
});

export default router;
