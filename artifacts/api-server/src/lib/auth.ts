import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const SECRET = process.env.SESSION_SECRET ?? "disclone-secret";

export function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { sub: number } | null {
  try {
    const payload = jwt.verify(token, SECRET) as unknown as { sub: number };
    return payload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  (req as Request & { userId: number }).userId = payload.sub;
  next();
}

export function getUserId(req: Request): number {
  return (req as Request & { userId: number }).userId;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  // First do auth check
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  (req as Request & { userId: number }).userId = payload.sub;

  // Then check admin
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.sub));
  if (!user || !user.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  (req as Request & { user?: typeof usersTable.$inferSelect }).user = user;
  next();
}
