import cors from "cors";
import express, { Express } from "express";
import { userRoutes } from "./user";

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware to enable CORS
app.use(cors());
// Middleware to parse JSON bodies
app.use(express.json());
// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Use the routes
app.use("/users", userRoutes);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
