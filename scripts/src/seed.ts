import { createClient } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { usersTable, serversTable, membersTable, channelsTable, rolesTable } from "@workspace/db/schema";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://localhost:5432/disclone";

const client = createClient({ connectionString: DATABASE_URL });
const db = drizzle(client);

async function seed() {
  await client.connect();

  const adminEmail = "admin@disclone.app";
  const [existingAdmin] = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail));

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("Admin1234!", 10);
    const [admin] = await db.insert(usersTable).values({
      email: adminEmail,
      username: "disclone_admin",
      discriminator: "0001",
      displayName: "DisClone Admin",
      passwordHash,
      status: "online",
      isAdmin: true,
      showAdminTag: true,
    }).returning();
    console.log("Created admin account:", admin.username, "id:", admin.id);
  } else {
    console.log("Admin account already exists:", existingAdmin.username);
    await db.update(usersTable).set({ isAdmin: true, showAdminTag: true }).where(eq(usersTable.id, existingAdmin.id));
    console.log("Updated admin flags");
  }

  const [demo] = await db.select().from(usersTable).where(eq(usersTable.email, "demo@disclone.app"));
  if (demo) {
    await db.update(usersTable).set({ isAdmin: true }).where(eq(usersTable.id, demo.id));
    console.log("Set demo as admin");
  }

  const [adminUser] = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail));
  if (adminUser) {
    const [adminServer] = await db.select().from(serversTable).where(eq(serversTable.name, "Admin HQ"));
    if (!adminServer) {
      const [server] = await db.insert(serversTable).values({
        name: "Admin HQ",
        description: "DisClone Admin Headquarters",
        ownerId: adminUser.id,
        isPublic: true,
      }).returning();

      await db.insert(channelsTable).values([
        { serverId: server.id, name: "general", type: "text", position: 0 },
        { serverId: server.id, name: "announcements", type: "text", position: 1 },
        { serverId: server.id, name: "voice-chat", type: "voice", position: 2 },
      ]);
      const [role] = await db.insert(rolesTable).values({
        serverId: server.id, name: "Admin", color: "#dc2626", position: 1, permissions: 8,
      }).returning();
      await db.insert(membersTable).values({
        userId: adminUser.id, serverId: server.id, roles: [role.id],
      });
      console.log("Created Admin HQ server:", server.id);
    } else {
      console.log("Admin HQ server already exists");
    }
  }

  await client.end();
  console.log("Seed complete.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
