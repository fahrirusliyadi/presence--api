import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { db } from '../db';
import { userTable } from '../db/schema';
import { validate } from '../validation';
import { createUserSchema } from './validations';
import { count, eq } from 'drizzle-orm';
import { deleteFace, updateFace } from './face-recognition';
import { catchAsync, NotFoundError } from '../error';
import { deleteFile } from '../static';

const router = express.Router();
// Configure storage with custom filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'storage/user');
  },
  filename: (req, file, cb) => {
    // Get file extension
    const fileExt = path.extname(file.originalname);

    // Create custom filename (timestamp + original name + extension)
    // You can customize this logic however you want
    const customFilename = `${Date.now()}-${path.basename(file.originalname, fileExt)}${fileExt}`;

    cb(null, customFilename);
  },
});
// Create multer instance with custom storage
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Optional: 5MB file size limit
  fileFilter: (req, file, cb) => {
    // Optional: validate file types
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
    }
  },
});

// GET all users
router.get(
  '/',
  catchAsync(async (req: Request, res: Response) => {
    // Get pagination parameters from query string
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '10');
    // Calculate offset
    const offset = (page - 1) * limit;
    // This is where you would fetch users from your database
    const users = await db.select().from(userTable).limit(limit).offset(offset);
    // Get total count for pagination metadata
    const [{ total }] = await db.select({ total: count() }).from(userTable);
    const lastPage = Math.ceil(total / limit);

    res.json({ data: users, page, lastPage });
  }),
);

// POST create new user
router.post(
  '/',
  upload.single('photo'),
  validate(createUserSchema),
  catchAsync(async (req: Request, res: Response) => {
    try {
      const userData = req.body;
      const photoFile = req.file;
      const user: typeof userTable.$inferInsert = {
        name: userData.name,
        email: userData.email,
        photo: photoFile ? `user/${photoFile.filename}` : null,
      };

      // Use a transaction to ensure database consistency
      await db.transaction(async (tx) => {
        // Insert the user within the transaction
        const [{ id }] = await tx.insert(userTable).values(user).$returningId();

        // Register the face within the same transaction
        if (photoFile) {
          await updateFace(id, photoFile);
        }
      });

      res.status(204).end();
    } catch (error) {
      // Delete the uploaded file if an error occurs
      if (req.file) {
        deleteFile(req.file.path.replace('storage/', ''));
      }

      throw error;
    }
  }),
);

// DELETE user
router.delete(
  '/:id',
  catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, id));

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await db.delete(userTable).where(eq(userTable.id, id));
    deleteFace(id).catch(console.warn);

    if (user.photo) {
      deleteFile(user.photo);
    }

    res.status(204).end();
  }),
);

export default router;
