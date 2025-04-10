import {
  mysqlTable,
  serial,
  timestamp,
  varchar,
  date,
  bigint,
} from 'drizzle-orm/mysql-core';

export const userTable = mysqlTable('user', {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  photo: varchar({ length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const presenceTable = mysqlTable('presence', {
  id: serial().primaryKey(),
  userId: bigint('user_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => userTable.id),
  date: date().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});
