import { z } from 'zod';
import { db } from '../db';
import { userTable } from '../db/schema';
import { and, eq, ne } from 'drizzle-orm';

/**
 * Checks if an email is unique in the database
 * @param email The email to check
 * @param excludeUserId Optional user ID to exclude from the check (for updates)
 * @returns True if email is unique, false otherwise
 */
export const isEmailUnique = async (
  email: string,
  excludeUserId?: number,
): Promise<boolean> => {
  const query = excludeUserId
    ? db
        .select()
        .from(userTable)
        .where(and(eq(userTable.email, email), ne(userTable.id, excludeUserId)))
        .limit(1)
    : db.select().from(userTable).where(eq(userTable.email, email)).limit(1);

  const [existingUser] = await query;
  return !existingUser;
};

// Base schema with common user fields
export const userBaseSchema = z.object({
  name: z.string({ required_error: 'Nama wajib diisi' }),
  email: z
    .string({ required_error: 'Email wajib diisi' })
    .email('Email tidak valid'),
  photo: z.string().optional(),
  classId: z
    .union([
      z.string().transform((val) => (val === '' ? null : Number(val))),
      z.number().int().positive(),
      z.null(),
    ])
    .optional()
    .nullable(),
});

// Create schema requires certain fields
export const createUserSchema = userBaseSchema;

// Update schema makes all fields optional
export const updateUserSchema = userBaseSchema.partial();
