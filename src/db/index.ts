import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import config from "../config";

// Create the MySQL connection pool properly
const poolConnection = mysql.createPool({
  uri: config.db.url,
});

// Now pass the initialized pool to Drizzle
export const db = drizzle(poolConnection);
