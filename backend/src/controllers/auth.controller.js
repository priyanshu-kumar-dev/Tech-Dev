import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.SECRET_KEY;
  if (!secret) {
    const error = new Error("JWT_SECRET must be configured");
    error.status = 500;
    throw error;
  }
  return secret;
}

function createAuthResponse(user, statusCode, res) {
  const token = jwt.sign({ sub: user.id }, getJwtSecret(), {
    expiresIn: TOKEN_LIFETIME_SECONDS,
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_LIFETIME_SECONDS * 1000,
  });

  return res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
}

export async function signup(req, res, next) {
  const { name, email, password, passwordConfirm, phoneNumber } = req.body || {};
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedName || !normalizedEmail || !password || !passwordConfirm) {
    return res.status(400).json({
      status: "fail",
      message: "Name, email, password, and password confirmation are required",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      status: "fail",
      message: "Please provide a valid email address",
    });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({
      status: "fail",
      message: "Password must be at least 8 characters long",
    });
  }

  if (password !== passwordConfirm) {
    return res.status(400).json({
      status: "fail",
      message: "Password and password confirmation do not match",
    });
  }

  try {
    getJwtSecret();
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phoneNumber: typeof phoneNumber === "string" ? phoneNumber.trim() : "",
      password,
    });

    return createAuthResponse(user, 201, res);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        status: "fail",
        message: "An account with that email already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ status: "fail", message: error.message });
    }

    return next(error);
  }
}

export async function login(req, res, next) {
  const { email, password } = req.body || {};
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail || typeof password !== "string" || !password) {
    return res.status(400).json({
      status: "fail",
      message: "Email and password are required",
    });
  }

  try {
    getJwtSecret();
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password"
    );
    const passwordMatches =
      user && (await bcrypt.compare(password, user.password));

    if (!passwordMatches) {
      return res.status(401).json({
        status: "fail",
        message: "Incorrect email or password",
      });
    }

    return createAuthResponse(user, 200, res);
  } catch (error) {
    return next(error);
  }
}
