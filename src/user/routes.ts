import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { db, paginate } from '../db';
import { userTable, classTable } from '../db/schema';
import { validate } from '../validation';
import { createUserSchema, updateUserSchema } from './validations';
import { count, eq } from 'drizzle-orm';
import { deleteFace, updateFace } from './face-recognition';
import { catchAsync, NotFoundError } from '../error';
import { deleteFile } from '../static';
import { z } from 'zod';

// Define user types based on the validation schema
type UserCreateInput = z.infer<typeof createUserSchema>;
type UserUpdateInput = z.infer<typeof updateUserSchema>;
type UserRecord = typeof userTable.$inferSelect;

// Helper functions for user operations
const handleUserPhoto = (
  photoFile: Express.Multer.File | undefined,
): string | null => {
  return photoFile ? `user/${photoFile.filename}` : null;
};

const cleanupUploadedFile = (file: Express.Multer.File | undefined): void => {
  if (file) {
    deleteFile(file.path.replace('storage/', ''));
  }
};

const processUserWithPhoto = async (
  id: number,
  photoFile: Express.Multer.File | undefined,
  oldPhoto: string | null = null,
): Promise<void> => {
  if (photoFile) {
    await updateFace(id, photoFile);

    // Clean up old photo if it exists and is different
    if (oldPhoto) {
      deleteFile(oldPhoto);
    }
  }
};

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
    // Build the base query with class join
    const query = db
      .select({
        user: userTable,
        class: classTable,
      })
      .from(userTable)
      .leftJoin(classTable, eq(userTable.classId, classTable.id));

    // Create a count query for total records
    const countQuery = db.select({ total: count() }).from(userTable);

    // Apply pagination
    const result = await paginate(req, query, countQuery);

    // Transform the result to include class as a nested object with proper typing
    const transformedData = result.data.map((item) => {
      // Extract user and class from item with proper typing
      const user = item.user as typeof userTable.$inferSelect;
      const classData = item.class as typeof classTable.$inferSelect | null;

      return {
        ...user,
        class: classData,
      };
    });

    // Return the modified result
    res.json({
      data: transformedData,
      page: result.page,
      lastPage: result.lastPage,
    });
  }),
);

// GET user by ID
router.get(
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

    res.json({ data: user });
  }),
);

// Function to handle user creation or update
const processUser = async (
  userData: UserCreateInput | UserUpdateInput,
  photoFile: Express.Multer.File | undefined,
  existingUser?: UserRecord,
): Promise<number> => {
  const isUpdate = !!existingUser;
  let userId = isUpdate ? existingUser.id : 0;

  // For update operations, we can use partial types
  if (isUpdate) {
    // Prepare update data with only the fields we want to update
    const updateData: Partial<typeof userTable.$inferInsert> = {};

    if (userData.name) updateData.name = userData.name;
    if (userData.email) updateData.email = userData.email;
    if (userData.classId) updateData.classId = userData.classId;
    if (photoFile) {
      updateData.photo = handleUserPhoto(photoFile);
    }

    // No changes needed for update
    if (Object.keys(updateData).length === 0) {
      return userId;
    }

    // Database update operation with transaction
    await db.transaction(async (tx) => {
      // Update existing user
      await tx
        .update(userTable)
        .set(updateData)
        .where(eq(userTable.id, userId));

      // Process photo and face recognition
      await processUserWithPhoto(userId, photoFile, existingUser.photo);
    });
  } else {
    // For insert operations, we need to ensure required fields are present
    const insertData = {
      name: (userData as UserCreateInput).name,
      email: (userData as UserCreateInput).email,
      classId: (userData as UserCreateInput).classId,
      photo: photoFile ? handleUserPhoto(photoFile) : null,
    } as const; // Use as const to ensure type safety

    // Database insert operation with transaction
    await db.transaction(async (tx) => {
      // Create new user
      const [{ id }] = await tx
        .insert(userTable)
        .values(insertData)
        .$returningId();
      userId = id;

      // Process photo and face recognition
      if (photoFile) {
        await processUserWithPhoto(userId, photoFile, null);
      }
    });
  }

  return userId;
};

// POST create new user
router.post(
  '/',
  upload.single('photo'),
  validate(createUserSchema),
  catchAsync(async (req: Request, res: Response) => {
    try {
      await processUser(req.body, req.file);
      res.status(204).end();
    } catch (error) {
      cleanupUploadedFile(req.file);
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

// PUT update user
router.put(
  '/:id',
  upload.single('photo'),
  validate(updateUserSchema),
  catchAsync(async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, id));

      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      await processUser(req.body, req.file, existingUser);
      res.status(204).end();
    } catch (error) {
      cleanupUploadedFile(req.file);
      throw error;
    }
  }),
);

export default router;
