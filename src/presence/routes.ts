import express, { Request, Response } from 'express';
import multer from 'multer';
import { recognizeFace } from '../user/face-recognition';
import { db } from '../db';
import { presenceTable, userTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { BadRequestError, catchAsync, NotFoundError } from '../error';

const router = express.Router();

// Set up multer to store files in memory without saving to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // limit file size to 5MB
  },
});

router.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    const date = new Date(new Date().setHours(0, 0, 0, 0));
    const presences = await db.query.presenceTable.findMany({
      where: eq(presenceTable.date, date),
      with: {
        user: true,
      },
    });
    res.json({
      data: presences,
    });
  }),
);

router.post(
  '/',
  upload.single('image'),
  catchAsync(async (req: Request, res: Response) => {
    // Check if file exists in the request
    if (!req.file) {
      throw new BadRequestError('No image file provided');
    }

    const userId = await recognizeFace(req.file);
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if the user has already checked in
    const [existingPresence] = await db
      .select()
      .from(presenceTable)
      .where(
        and(
          eq(presenceTable.userId, userId),
          eq(presenceTable.date, new Date(new Date().setHours(0, 0, 0, 0))),
        ),
      )
      .limit(1);

    if (existingPresence) {
      return res.json({
        data: {
          ...existingPresence,
          user,
        },
      });
    }

    // Insert new presence record
    const newPresence = {
      userId: userId,
      date: new Date(new Date().setHours(0, 0, 0, 0)),
    };
    const [{ id }] = await db
      .insert(presenceTable)
      .values(newPresence)
      .$returningId();
    const [presence] = await db
      .select()
      .from(presenceTable)
      .where(eq(presenceTable.id, id))
      .limit(1);

    res.status(200).json({
      data: {
        ...presence,
        user,
      },
    });
  }),
);

export default router;
