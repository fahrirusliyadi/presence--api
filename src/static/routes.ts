import express from "express";
import path from "path";

const router = express.Router();

// Serve static files from storage/user directory
router.use("/", express.static(path.join(process.cwd(), "storage")));

export default router;
