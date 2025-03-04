import express, { Request, Response } from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { AppDataSource } from "./data-source";
import userRoutes from "./routes/userRoutes";
import fileRoutes from "./routes/fileRoutes";
import * as path from "path";
import rateLimit from "express-rate-limit";

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiter middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/files", fileRoutes);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../../frontend/build")));
  
  app.get("*", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../../frontend/build/index.html"));
  });
}

// Initialize database connection
const startServer = async () => {
  try {
    await AppDataSource.initialize();
    console.log("Data Source has been initialized!");
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error during Data Source initialization:", error);
    
    // Start server even if database connection fails
    // This allows the frontend to work and show appropriate error messages
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (without database connection)`);
    });
  }
};

startServer();
