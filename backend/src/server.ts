// backend/src/server.ts
import "reflect-metadata";
import express, { Request, Response, NextFunction, RequestHandler } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { User } from "./models/User";
import { File } from "./models/File";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(helmet());

// Cast rate limiter to RequestHandler
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
}) as unknown as RequestHandler;
app.use(limiter);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueFilename);
  },
});
const upload = multer({ storage });

// TypeORM Data Source for PostgreSQL
const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: true, // For development only. Disable in production.
  logging: false,
  entities: [User, File],
});

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Async handler wrapper to catch errors
const asyncHandler = (fn: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Verify token middleware
function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    res.status(401).json({ error: "No token provided" });
    return;
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Malformed token" });
    return;
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(401).json({ error: "Invalid token" });
    } else {
      (req as any).user = decoded;
      next();
    }
  });
}

// Routes

app.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required for StratoSafe registration" });
      return;
    }
    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({ where: { username } });
    if (existingUser) {
      res.status(400).json({ error: "User already exists in StratoSafe" });
      return;
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = new User();
    newUser.username = username;
    newUser.passwordHash = passwordHash;
    await userRepository.save(newUser);
    res.json({ message: "User registered successfully for StratoSafe" });
  })
);

app.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { username } });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials for StratoSafe" });
      return;
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials for StratoSafe" });
      return;
    }
    const payload = { id: user.id, username: user.username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  })
);

app.post(
  "/upload",
  verifyToken,
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded to StratoSafe" });
      return;
    }
    const userPayload = (req as any).user as { id: number; username: string };
    const userRepository = AppDataSource.getRepository(User);
    const fileRepository = AppDataSource.getRepository(File);
    const user = await userRepository.findOne({ where: { id: userPayload.id } });
    if (!user) {
      res.status(401).json({ error: "Invalid user for StratoSafe" });
      return;
    }
    const fileEntity = new File();
    fileEntity.filename = req.file.filename;
    fileEntity.originalName = req.file.originalname;
    fileEntity.owner = user;
    await fileRepository.save(fileEntity);
    res.json({ message: "File uploaded successfully to StratoSafe", file: req.file });
  })
);

app.get('/', (req, res) => {
  res.send('Welcome to StratoSafe Backend!');
});

app.get(
  "/files",
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userPayload = (req as any).user as { id: number; username: string };
    const fileRepository = AppDataSource.getRepository(File);
    const files = await fileRepository.find({
      where: { owner: { id: userPayload.id } },
      relations: ["owner"],
    });
    res.json({ files });
  })
);

app.get(
  "/files/:id/download",
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userPayload = (req as any).user as { id: number; username: string };
    const fileRepository = AppDataSource.getRepository(File);
    const fileEntity = await fileRepository.findOne({
      where: { id: parseInt(id), owner: { id: userPayload.id } },
      relations: ["owner"],
    });
    if (!fileEntity) {
      res.status(404).json({ error: "File not found in StratoSafe" });
      return;
    }
    const filePath = path.join(__dirname, "uploads", fileEntity.filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath, fileEntity.originalName);
    } else {
      res.status(404).json({ error: "File not found on disk in StratoSafe" });
    }
  })
);

app.get(
  "/files/:id/preview",
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userPayload = (req as any).user as { id: number; username: string };
    const fileRepository = AppDataSource.getRepository(File);
    const fileEntity = await fileRepository.findOne({
      where: { id: parseInt(id), owner: { id: userPayload.id } },
      relations: ["owner"],
    });
    if (!fileEntity) {
      res.status(404).json({ error: "File not found in StratoSafe" });
      return;
    }
    const filePath = path.join(__dirname, "uploads", fileEntity.filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "File not found on disk in StratoSafe" });
    }
  })
);

// Global error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error in StratoSafe" });
});

// Initialize the Data Source and start the server
AppDataSource.initialize()
  .then(() => {
    console.log("Postgres database connected for StratoSafe");
    app.listen(port, () => {
      console.log(`StratoSafe backend running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Error during Data Source initialization", err);
  });
