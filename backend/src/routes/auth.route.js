import express from "express";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", registerUser);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", getCurrentUser);
router.post("/logout", logoutUser);

export default router;
