import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serversTable = pgTable("servers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  iconUrl: text("icon_url"),
  bannerUrl: text("banner_url"),
  ownerId: integer("owner_id").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  boostLevel: integer("boost_level").notNull().default(0),
  boostCount: integer("boost_count").notNull().default(0),
  vanityUrl: text("vanity_url"),
  verificationLevel: integer("verification_level").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertServerSchema = createInsertSchema(serversTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertServer = z.infer<typeof insertServerSchema>;
export type Server = typeof serversTable.$inferSelect;
