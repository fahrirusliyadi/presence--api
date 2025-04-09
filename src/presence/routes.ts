import express, { Request, Response } from "express";
import multer from "multer";
import { recognizeFace } from "../user/face-recognition";
import { db } from "../db";
import { usersTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { catchAsync } from "../error";

const router = express.Router();

// Set up multer to store files in memory without saving to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // limit file size to 5MB
  },
});

router.post(
  "/",
  upload.single("image"),
  catchAsync(async (req: Request, res: Response) => {
    // Check if file exists in the request
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const userId = await recognizeFace(req.file);
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];

    // Return success response with file metadata
    res.status(200).json({
      data: user,
    });
  }),
);

export default router;
