import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import "../config/env.js";
import User from "../models/user.model.js";

const TOKEN_EXPIRES_IN = "1d";
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
  };
}

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    ...COOKIE_OPTIONS,
    maxAge: COOKIE_MAX_AGE,
  });
}

function createToken(user) {
  return jwt.sign({ sub: user._id.toString() }, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRES_IN,
  });
}

function databaseUnavailable(res) {
  return res.status(503).json({
    status: "error",
    message: "Authentication is unavailable because the database is not connected.",
  });
}

export async function registerUser(req, res) {
  const { name, email, password, passwordConfirm, phoneNumber = "" } =
    req.body || {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof passwordConfirm !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !password ||
    !passwordConfirm
  ) {
    return res.status(400).json({
      status: "fail",
      message: "Name, email, password and password confirmation are required.",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      status: "fail",
      message: "Password must be at least 8 characters long.",
    });
  }

  if (password !== passwordConfirm) {
    return res.status(400).json({
      status: "fail",
      message: "Passwords do not match.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      status: "fail",
      message: "Please provide a valid email address.",
    });
  }

  if (typeof phoneNumber !== "string") {
    return res.status(400).json({
      status: "fail",
      message: "Phone number must be a string.",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(503).json({
      status: "error",
      message: "Authentication is not configured because JWT_SECRET is missing.",
    });
  }

  if (!isDatabaseConnected()) {
    return databaseUnavailable(res);
  }

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        status: "fail",
        message: "An account with this email already exists.",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phoneNumber: phoneNumber.trim(),
      password,
    });
    const authToken = createToken(user);

    setAuthCookie(res, authToken);

    return res.status(201).json({
      status: "success",
      message: "Account created successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        status: "fail",
        message: "An account with this email already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        status: "fail",
        message: error.message,
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to create your account right now.",
    });
  }
}

export async function loginUser(req, res) {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      status: "fail",
      message: "Email and password are required.",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(503).json({
      status: "error",
      message: "Authentication is not configured because JWT_SECRET is missing.",
    });
  }

  if (!isDatabaseConnected()) {
    return databaseUnavailable(res);
  }

  try {
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid email or password.",
      });
    }

    setAuthCookie(res, createToken(user));

    return res.status(200).json({
      status: "success",
      message: "Login successful.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Unable to log in right now.",
    });
  }
}

export async function getCurrentUser(req, res) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      status: "fail",
      message: "You are not signed in.",
    });
  }

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch (error) {
    if (
      error.name !== "JsonWebTokenError" &&
      error.name !== "TokenExpiredError"
    ) {
      console.error("Session verification error:", error.message);
      return res.status(500).json({
        status: "error",
        message: "Unable to verify your session right now.",
      });
    }

    return res.status(401).json({
      status: "fail",
      message: "Your session is invalid or expired.",
    });
  }

  if (typeof payload === "string" || !payload.sub) {
    return res.status(401).json({
      status: "fail",
      message: "Your session is invalid or expired.",
    });
  }

  if (!isDatabaseConnected()) {
    return databaseUnavailable(res);
  }

  try {
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "Your account could not be found.",
      });
    }

    return res.status(200).json({
      status: "success",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Session lookup error:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Unable to verify your session right now.",
    });
  }
}

export function logoutUser(req, res) {
  res.clearCookie("token", COOKIE_OPTIONS);
  return res.status(200).json({
    status: "success",
    message: "You have been signed out.",
  });
}
