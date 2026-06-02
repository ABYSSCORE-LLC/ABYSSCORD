import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rolesTable = pgTable("roles", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#99aab5"),
  position: integer("position").notNull().default(0),
  hoist: boolean("hoist").notNull().default(false),
  mentionable: boolean("mentionable").notNull().default(false),
  permissions: integer("permissions").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRoleSchema = createInsertSchema(rolesTable).omit({ id: true, createdAt: true });
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof rolesTable.$inferSelect;
