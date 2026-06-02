import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const channelsTable = pgTable("channels", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull(),
  parentId: integer("parent_id"),
  name: text("name").notNull(),
  topic: text("topic"),
  type: text("type").notNull().default("text"),
  position: integer("position").notNull().default(0),
  slowmode: integer("slowmode").notNull().default(0),
  nsfw: boolean("nsfw").notNull().default(false),
  userLimit: integer("user_limit"),
  bitrate: integer("bitrate"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertChannelSchema = createInsertSchema(channelsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channelsTable.$inferSelect;
