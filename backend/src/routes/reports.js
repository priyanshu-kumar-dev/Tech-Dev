import express from "express";
import {
  listReports,
  getReportById,
} from "../controllers/analysisController.js";

const router = express.Router();

router.get("/reports", listReports);
router.get("/reports/:id", getReportById);

export default router;