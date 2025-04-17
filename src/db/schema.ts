import {
  mysqlTable,
  serial,
  timestamp,
  varchar,
  date,
  bigint,
  mysqlEnum,
  index,
  time,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// Define enum for presence status
export enum PresenceStatus {
  PRESENT = 'present',
  LATE = 'late',
}

export const userTable = mysqlTable('user', {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  photo: varchar({ length: 255 }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .onUpdateNow(),
});

export const presenceTable = mysqlTable(
  'presence',
  {
    id: serial().primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => userTable.id),
    date: date({ mode: 'string' }).notNull(),
    status: mysqlEnum(
      'status',
      Object.values(PresenceStatus) as [string, ...string[]],
    ).notNull(),
    checkIn: time('check_in'),
    checkOut: time('check_out'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .onUpdateNow(),
  },
  (table) => [index('status_idx').on(table.status)],
);

// Define relationships between tables
export const userRelations = relations(userTable, ({ many }) => ({
  presences: many(presenceTable),
}));

export const presenceRelations = relations(presenceTable, ({ one }) => ({
  user: one(userTable, {
    fields: [presenceTable.userId],
    references: [userTable.id],
  }),
}));
