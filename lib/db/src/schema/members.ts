import { pgTable, text, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const membersTable = pgTable("members", {
  userId: integer("user_id").notNull(),
  serverId: integer("server_id").notNull(),
  nickname: text("nickname"),
  roles: integer("roles").array().default([]),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.serverId] })]);

export const insertMemberSchema = createInsertSchema(membersTable).omit({ joinedAt: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof membersTable.$inferSelect;
