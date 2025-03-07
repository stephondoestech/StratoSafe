// In backend/src/data-source.ts
import { DataSource } from "typeorm";
import { User } from "./models/User";
import { File } from "./models/File";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "stratosafe",
  synchronize: true, // Set to false in production
  logging: process.env.NODE_ENV !== "production",
  entities: [User, File],
  migrations: [],
  subscribers: [],
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});
