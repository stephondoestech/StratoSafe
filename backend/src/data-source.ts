import { DataSource } from "typeorm";
import { User } from "./models/User";
import { File } from "./models/File";
import { SystemSettings } from "./models/SystemSettings";
import { config } from "./config/environment";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.DB_HOST,
  port: config.DB_PORT,
  username: config.DB_USERNAME,
  password: config.DB_PASSWORD,
  database: config.DB_DATABASE,
  synchronize: config.NODE_ENV !== 'production', // Only sync in development
  logging: config.NODE_ENV === 'development',
  entities: [User, File, SystemSettings],
  migrations: [],
  subscribers: [],
  ssl: config.DB_SSL ? { rejectUnauthorized: false } : false,
});
