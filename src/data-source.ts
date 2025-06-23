import "reflect-metadata";
import { DataSource } from "typeorm";
import { Deal } from "./lib/entities/deals/Deal";
import { AuditLog } from "./lib/entities/auditLog/AuditLog";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "./database.sqlite",
  synchronize: true, // Automatically create database schema based on entities
  logging: false,
  entities: [Deal, AuditLog],
  migrations: [],
  subscribers: [],
});

// Global initialization promise to prevent concurrent initialization
let initializationPromise: Promise<DataSource> | null = null;

// Function to initialize the data source if not already initialized
export async function initializeDataSource() {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      await AppDataSource.initialize();
      console.log("Data Source has been initialized!");
      return AppDataSource;
    } catch (err) {
      console.error("Error during Data Source initialization:", err);
      initializationPromise = null; // Reset on error so we can retry
      throw err;
    }
  })();

  return initializationPromise;
}
