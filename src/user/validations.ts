import { z } from 'zod';

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
