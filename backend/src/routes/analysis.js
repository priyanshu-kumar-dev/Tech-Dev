import express from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { analyzeImage } from "../controllers/analysisController.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirectory = path.resolve(__dirname, "../../uploads");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: (Number(process.env.MAX_IMAGE_SIZE_MB) || 10) * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error("Only JPG, PNG and WEBP images are supported.");
      error.status = 400;
      return cb(error);
    }

    cb(null, true);
  },
});

router.post("/analyze", upload.single("image"), analyzeImage);

export default router;