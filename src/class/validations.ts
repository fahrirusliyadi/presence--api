import { z } from 'zod';

// Base schema with common class fields
export const classBaseSchema = z.object({
  name: z.string({ required_error: 'Nama kelas wajib diisi' }),
});

// Create schema requires certain fields
export const createClassSchema = classBaseSchema;

// Update schema makes all fields optional
export const updateClassSchema = classBaseSchema.partial();
