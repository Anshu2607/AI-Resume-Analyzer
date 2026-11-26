import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  register,
  login,
} from "../controllers/auth.controller.js";

import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import User from "../models/user.model.js";

const router = Router();

// Authentication rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});

// Public routes
router.post("/register", authLimiter, register);

router.post("/login", authLimiter, login);

// Protected user profile route
router.get(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = await User.findById(req.user?.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });

        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    } catch {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Admin-only route
router.get(
  "/admin",
  authenticate,
  authorize("admin"),
  (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome Admin",
    });
  }
);

export default router;