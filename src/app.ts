import cors from "cors";
import express, { Express } from "express";
import path from "path";
import { userRoutes } from "./user";

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware to enable CORS
app.use(cors());
// Middleware to parse JSON bodies
app.use(express.json());
// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files from storage/user directory
app.use("/files", express.static(path.join(process.cwd(), "storage")));

// Use the routes
app.use("/users", userRoutes);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
