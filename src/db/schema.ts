import { mysqlTable, serial, timestamp, varchar } from "drizzle-orm/mysql-core";

export const usersTable = mysqlTable("user", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  photo: varchar({ length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
