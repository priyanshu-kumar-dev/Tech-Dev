
import express from "express";
<<<<<<< HEAD
import fs from "node:fs";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
=======
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
import {
  listReports,
  getReportById,
  updateReportStatus,
<<<<<<< HEAD
  addRepairPhoto,
  deleteReport,
  getModelPerformance,
=======
  uploadRepairPhoto,
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
} from "../controllers/analysisController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

<<<<<<< HEAD
const repairPhotoUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
      callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: {
    fileSize: (Number(process.env.MAX_IMAGE_SIZE_MB) || 10) * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      const error = new Error("Only JPG, PNG and WEBP images are supported.");
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

router.get("/analytics/model-performance", getModelPerformance);
router.get("/reports", listReports);
router.get("/reports/:id", getReportById);
router.post(
  "/reports/:id/repair-photo",
  authenticate,
  requireAdmin,
  repairPhotoUpload.single("image"),
  addRepairPhoto
);
router.delete("/reports/:id", authenticate, requireAdmin, deleteReport);
router.patch(
  "/reports/:id/status",
  authenticate,
  requireAdmin,
  updateReportStatus
);
=======
const uploadDirectory = path.resolve("uploads", "repairs");

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
    } else {
      callback(new Error("Only image files are allowed."));
    }
  },
});

router.get("/reports", listReports);
router.get("/reports/:id", getReportById);
router.patch("/reports/:id/status", updateReportStatus);
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70

// Upload a before-repair or after-repair photo
router.post(
  "/reports/:id/repair-photos",
  upload.single("photo"),
  uploadRepairPhoto
);

export default router;
