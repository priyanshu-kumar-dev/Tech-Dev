
import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import {
  listReports,
  getReportById,
  updateReportStatus,
  uploadRepairPhoto,
} from "../controllers/analysisController.js";

const router = express.Router();

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

// Upload a before-repair or after-repair photo
router.post(
  "/reports/:id/repair-photos",
  upload.single("photo"),
  uploadRepairPhoto
);

export default router;
