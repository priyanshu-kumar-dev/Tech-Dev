import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/user.model.js";

export async function authenticate(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Sign in to manage maintenance statuses.",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(503).json({
      success: false,
      message: "Authentication is not configured.",
    });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (
      error.name !== "JsonWebTokenError" &&
      error.name !== "TokenExpiredError"
    ) {
      return next(error);
    }

    return res.status(401).json({
      success: false,
      message: "Your session is invalid or expired.",
    });
  }

  if (typeof payload === "string" || !payload.sub) {
    return res.status(401).json({
      success: false,
      message: "Your session is invalid or expired.",
    });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Authentication is unavailable because the database is not connected.",
    });
  }

  try {
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Your account could not be found.",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Administrator access is required to update maintenance status.",
    });
  }

  return next();
}
