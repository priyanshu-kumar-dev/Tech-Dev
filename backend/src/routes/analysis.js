
import express from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  analyzeImage,
  analyzeVideo,
} from "../controllers/analysisController.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirectory = path.resolve(__dirname, "../../uploads");

mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${extension}`);
  },
});

const imageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const videoTypes = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
]);

function createUpload(allowedTypes, maxSizeMB, message) {
  return multer({
    storage,
    limits: {
      fileSize: maxSizeMB * 1024 * 1024,
      files: 1,
      fields: 10,
      parts: 11,
    },
    fileFilter: (_req, file, cb) => {
      if (!allowedTypes.has(file.mimetype)) {
        const error = new Error(message);
        error.status = 400;
        return cb(error);
      }

      return cb(null, true);
    },
  });
}

const imageUpload = createUpload(
  imageTypes,
  Number(process.env.MAX_IMAGE_SIZE_MB) || 10,
  "Only JPG, PNG and WEBP images are supported."
);

const videoUpload = createUpload(
  videoTypes,
  Number(process.env.MAX_VIDEO_SIZE_MB) || 100,
  "Unsupported video format. Use MP4, WEBM, MOV, AVI or MKV."
);

// Image analysis
router.post("/analyze", imageUpload.single("image"), analyzeImage);

// Video analysis
router.post("/analyze-video", videoUpload.single("video"), analyzeVideo);

export default router;
