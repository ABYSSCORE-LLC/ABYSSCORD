import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invitesTable = pgTable("invites", {
  code: text("code").primaryKey(),
  serverId: integer("server_id").notNull(),
  channelId: integer("channel_id"),
  inviterId: integer("inviter_id").notNull(),
  uses: integer("uses").notNull().default(0),
  maxUses: integer("max_uses"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInviteSchema = createInsertSchema(invitesTable).omit({ createdAt: true });
export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof invitesTable.$inferSelect;
