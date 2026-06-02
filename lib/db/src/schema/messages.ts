import { pgTable, text, serial, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull(),
  authorId: integer("author_id").notNull(),
  content: text("content").notNull(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  isPinned: boolean("is_pinned").notNull().default(false),
  replyToId: integer("reply_to_id"),
  attachments: jsonb("attachments").default([]),
  reactions: jsonb("reactions").default([]),
  embeds: jsonb("embeds").default([]),
  mentions: integer("mentions").array().default([]),
  mentionsEveryone: boolean("mentions_everyone").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
