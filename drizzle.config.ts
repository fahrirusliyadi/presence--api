import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import config from "./src/config";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: config.db.url,
  },
});
