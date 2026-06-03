import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { signToken, requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...rest } = u;
  return rest;
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, username, password, displayName } = req.body;
  if (!email || !username || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const disc = String(Math.floor(1000 + Math.random() * 9000));
  const [user] = await db.insert(usersTable).values({
    email,
    username,
    discriminator: disc,
    displayName: displayName ?? username,
    passwordHash,
    status: "online",
  }).returning();
  const token = signToken(user.id);
  res.status(201).json({ token, user: formatUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Missing credentials" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  await db.update(usersTable).set({ status: "online" }).where(eq(usersTable.id, user.id));
  const token = signToken(user.id);
  res.json({ token, user: { ...formatUser(user), status: "online" } });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  await db.update(usersTable).set({ status: "offline" }).where(eq(usersTable.id, userId));
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "Not found" }); return; }
  res.json(formatUser(user));
});

router.patch("/auth/me/update", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const { username, email, displayName, bio, avatarUrl, bannerUrl, accentColor } = req.body;

  if (username !== undefined) {
    if (typeof username !== "string" || username.trim().length < 2 || username.trim().length > 32) {
      res.status(400).json({ error: "Username must be between 2 and 32 characters" }); return;
    }
  }
  if (email !== undefined) {
    if (typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Invalid email address" }); return;
    }
    const [existingEmail] = await db.select().from(usersTable).where(and(eq(usersTable.email, email)));
    if (existingEmail && existingEmail.id !== userId) {
      res.status(400).json({ error: "Email already in use" }); return;
    }
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (username !== undefined) updates.username = username.trim();
  if (email !== undefined) updates.email = email.trim();
  if (displayName !== undefined) updates.displayName = displayName;
  if (bio !== undefined) updates.bio = bio;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (bannerUrl !== undefined) updates.bannerUrl = bannerUrl;
  if (accentColor !== undefined) updates.accentColor = accentColor;

  const [user] = await db.update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();
  res.json(formatUser(user));
});

router.patch("/auth/me/password", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Both current and new password are required" }); return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }
  const newHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, userId));
  res.json({ success: true });
});

router.patch("/auth/me/status", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const { status, customStatus, customStatusEmoji } = req.body;
  const [user] = await db.update(usersTable)
    .set({ status, customStatus, customStatusEmoji })
    .where(eq(usersTable.id, userId))
    .returning();
  res.json(formatUser(user));
});

router.get("/me/activity", requireAuth, async (_req, res): Promise<void> => {
  res.json({ unreadChannels: [], unreadDMs: [], mentionCount: 0, onlineFriendCount: 0 });
});

export default router;
