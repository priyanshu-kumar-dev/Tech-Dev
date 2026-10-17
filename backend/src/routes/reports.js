import express from "express";
import fs from "node:fs";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  listReports,
  getReportById,
  updateReportStatus,
  addRepairPhoto,
  deleteReport,
  getModelPerformance,
} from "../controllers/analysisController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

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

export default router;