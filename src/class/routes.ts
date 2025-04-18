import express, { Request, Response } from 'express';
import { db, paginate } from '../db';
import { classTable, userTable } from '../db/schema';
import { validate } from '../validation';
import { createClassSchema, updateClassSchema } from './validations';
import { count, eq, like } from 'drizzle-orm';
import { catchAsync, NotFoundError, BadRequestError } from '../error';
import { z } from 'zod';

// Define class types based on the validation schema
type ClassCreateInput = z.infer<typeof createClassSchema>;
type ClassUpdateInput = z.infer<typeof updateClassSchema>;

const router = express.Router();

// GET all classes
router.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    // Build the base query
    const baseQuery = db.select().from(classTable);

    // Create a count query for total records
    const baseCountQuery = db.select({ total: count() }).from(classTable);

    // Apply search filter if search parameter exists
    if (req.query.search && typeof req.query.search === 'string') {
      const searchTerm = `%${req.query.search}%`;
      // Apply pagination with search filter
      const result = await paginate(
        req,
        baseQuery.where(like(classTable.name, searchTerm)),
        baseCountQuery.where(like(classTable.name, searchTerm)),
      );
      return res.json(result);
    }

    // Apply pagination without search filter
    const result = await paginate(req, baseQuery, baseCountQuery);
    res.json(result);
  }),
);

// GET class by ID
router.get(
  '/:id',
  catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const [classRecord] = await db
      .select()
      .from(classTable)
      .where(eq(classTable.id, id));

    if (!classRecord) {
      throw new NotFoundError('Kelas tidak ditemukan');
    }

    // Get students in this class
    const students = await db
      .select()
      .from(userTable)
      .where(eq(userTable.classId, id));

    res.json({
      data: {
        ...classRecord,
        students,
      },
    });
  }),
);

// POST create new class
router.post(
  '/',
  validate(createClassSchema),
  catchAsync(async (req: Request, res: Response) => {
    const classData = req.body as ClassCreateInput;

    // Insert new class record
    await db.insert(classTable).values({
      name: classData.name,
    });

    // Return 204 No Content status
    res.status(204).end();
  }),
);

// PUT update class
router.put(
  '/:id',
  validate(updateClassSchema),
  catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const classData = req.body as ClassUpdateInput;

    // Check if class exists
    const [existingClass] = await db
      .select()
      .from(classTable)
      .where(eq(classTable.id, id));

    if (!existingClass) {
      throw new NotFoundError('Kelas tidak ditemukan');
    }

    // Update class record if there are changes
    if (classData.name) {
      await db
        .update(classTable)
        .set({ name: classData.name })
        .where(eq(classTable.id, id));
    }

    // Return 204 No Content status
    res.status(204).end();
  }),
);

// DELETE class
router.delete(
  '/:id',
  catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    // Check if class exists
    const [existingClass] = await db
      .select()
      .from(classTable)
      .where(eq(classTable.id, id));

    if (!existingClass) {
      throw new NotFoundError('Kelas tidak ditemukan');
    }

    // Check if there are students in this class
    const students = await db
      .select({ count: count() })
      .from(userTable)
      .where(eq(userTable.classId, id));

    if (students[0].count > 0) {
      throw new BadRequestError(
        'Tidak dapat menghapus kelas yang memiliki siswa terkait',
      );
    }

    // Delete class record
    await db.delete(classTable).where(eq(classTable.id, id));

    res.status(204).end();
  }),
);

export default router;
