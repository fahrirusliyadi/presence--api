import { mysqlTable, serial, timestamp, varchar } from "drizzle-orm/mysql-core";

export const usersTable = mysqlTable("user", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  photo: varchar({ length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});
