import express, { Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { db } from "../db";
import { usersTable } from "../db/schema";

const router = express.Router();
// Configure storage with custom filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "storage/user");
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
    const allowedTypes = ["image/jpeg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG and PNG are allowed."));
    }
  },
});

// GET all users
router.get("/", async (req: Request, res: Response) => {
  try {
    // This is where you would fetch users from your database
    res.json({ message: "List of all users", users: [] });
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
});

// GET single user by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // This is where you would fetch a specific user by ID
    res.json({ message: `User with ID ${id}`, user: { id } });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error });
  }
});

// POST create new user
router.post(
  "/",
  upload.single("photo"),
  async (req: Request, res: Response) => {
    try {
      const userData = req.body;
      const photoFile = req.file;
      const user: typeof usersTable.$inferInsert = {
        name: userData.name,
        email: userData.email,
        photo: photoFile ? `user/${photoFile.filename}` : null,
      };

      await db.insert(usersTable).values(user);

      // This is where you would create a new user
      res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
      // Delete the uploaded file if an error occurs
      if (req.file) {
        const filePath = path.join(__dirname, "..", "..", req.file.path);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error("Error deleting file:", err);
          }
        });
      }

      res.status(500).json({ message: "Error creating user", error });
    }
  },
);

// PUT update user
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    // This is where you would update a user
    res.json({
      message: `User ${id} updated successfully`,
      user: { id, ...userData },
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error });
  }
});

// DELETE user
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // This is where you would delete a user
    res.json({ message: `User ${id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
});

export default router;
