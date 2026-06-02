import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dmChannelsTable = pgTable("dm_channels", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("dm"),
  name: text("name"),
  iconUrl: text("icon_url"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dmParticipantsTable = pgTable("dm_participants", {
  dmId: integer("dm_id").notNull(),
  userId: integer("user_id").notNull(),
});

export const dmMessagesTable = pgTable("dm_messages", {
  id: serial("id").primaryKey(),
  dmId: integer("dm_id").notNull(),
  authorId: integer("author_id").notNull(),
  content: text("content").notNull(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDmChannelSchema = createInsertSchema(dmChannelsTable).omit({ id: true, createdAt: true });
export const insertDmMessageSchema = createInsertSchema(dmMessagesTable).omit({ id: true, createdAt: true });
export type InsertDmChannel = z.infer<typeof insertDmChannelSchema>;
export type InsertDmMessage = z.infer<typeof insertDmMessageSchema>;
export type DmChannel = typeof dmChannelsTable.$inferSelect;
export type DmMessage = typeof dmMessagesTable.$inferSelect;
