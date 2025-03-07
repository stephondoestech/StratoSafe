// In backend/src/data-source.ts
import { DataSource } from "typeorm";
import { User } from "./models/User";
import { File } from "./models/File";
// Import the migration
import { AddThemePreference1709778342000 } from "./migrations/1709778342000-AddThemePreference";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "stratosafe",
  synchronize: false, // Set to false when using migrations
  logging: process.env.NODE_ENV !== "production",
  entities: [User, File],
  migrations: [AddThemePreference1709778342000], // Add your migration here
  subscribers: [],
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});
