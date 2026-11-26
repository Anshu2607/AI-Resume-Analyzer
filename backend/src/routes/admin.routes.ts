import { Router } from "express";

import {
  authenticate,
  requireAdmin,
} from "../middleware/auth.middleware.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import User from "../models/user.model.js";

import AdminMfa from "../models/adminMfa.model.js";

import adminAuthRoutes from "./adminAuth.routes.js";

import adminAnalyticsRoutes from "./adminAnalytics.routes.js";

import adminUserManagementRoutes from "./adminUserManagement.routes.js";

import adminAIUsageRoutes from "./adminAIUsage.routes.js";

import adminSystemHealthRoutes from "./adminSystemHealth.routes.js";

import adminAuditRoutes from "./adminAudit.routes.js";

import adminSessionRoutes from "./adminSession.routes.js";

import {
  adminAIQuotaRouter,
} from "./aiQuota.routes.js";

import {
  getAdminMfaStatus,
} from "../services/adminMfa.service.js";

const router = Router();

// =====================================
// ADMINISTRATOR AUTHENTICATION
// =====================================

router.use("/auth", adminAuthRoutes);

// =====================================
// PROTECTED ADMINISTRATOR ROUTES
// =====================================

router.use(authenticate);

router.use(requireAdmin);

router.use(async (
  req: AuthenticatedRequest,
  res,
  next
) => {

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  if (

    req.user?.sessionType !== "admin" ||

    req.user?.mfaVerified !== true

  ) {

    res.status(403).json({

      success: false,

      message:
        "MFA-verified administrator session required",

    });

    return;
  }

  try {

    const mfaEnabled = await AdminMfa.exists({

      userId: req.user.userId,

      enabled: true,

    });

    if (!mfaEnabled) {

      res.status(403).json({

        success: false,

        message:
          "Administrator MFA is not enabled",

      });

      return;
    }

    next();

  } catch {

    res.status(503).json({

      success: false,

      message:
        "Administrator authentication service unavailable",

    });

  }
});

// =====================================
// ADMINISTRATOR MODULES
// =====================================

router.use(
  "/analytics",
  adminAnalyticsRoutes
);

router.use(
  "/users",
  adminUserManagementRoutes
);

router.use(
  "/ai-usage",
  adminAIUsageRoutes
);

router.use(
  "/ai-quota",
  adminAIQuotaRouter
);

router.use(
  "/system-health",
  adminSystemHealthRoutes
);

router.use(
  "/audit-logs",
  adminAuditRoutes
);

router.use(
  "/session",
  adminSessionRoutes
);

// =====================================
// VERIFY ADMINISTRATOR ACCESS
// =====================================

router.get(
  "/verify",

  (req: AuthenticatedRequest, res) => {

    res.status(200).json({

      success: true,

      message:
        "Administrator access granted",

      data: {

        userId: req.user?.userId,

        role: req.user?.role,

        sessionType:
          req.user?.sessionType,

        mfaVerified:
          req.user?.mfaVerified,

      },

    });

  }
);

// =====================================
// ADMINISTRATOR PROFILE
// =====================================

router.get(
  "/profile",

  async (req: AuthenticatedRequest, res) => {

    try {

      const admin = await User.findById(
        req.user?.userId
      )

        .select(
          "name email role status createdAt " +
          "lastLoginAt lastActiveAt loginCount"
        )

        .lean();

      if (!admin) {

        res.status(404).json({

          success: false,

          message: "Administrator not found",

        });

        return;
      }

      res.status(200).json({

        success: true,

        data: {

          id: admin._id.toString(),

          name: admin.name,

          email: admin.email,

          role: admin.role,

          status: admin.status,

          createdAt: admin.createdAt,

          lastLoginAt: admin.lastLoginAt,

          lastActiveAt: admin.lastActiveAt,

          loginCount: admin.loginCount,

        },

      });

    } catch {

      res.status(500).json({

        success: false,

        message:
          "Unable to retrieve administrator profile",

      });

    }

  }
);

// =====================================
// ADMINISTRATOR MFA STATUS
// =====================================

router.get(
  "/mfa/status",

  async (req: AuthenticatedRequest, res) => {

    try {

      const result = await getAdminMfaStatus(
        req.user!.userId
      );

      res.status(200).json({

        success: true,

        data: result,

      });

    } catch {

      res.status(500).json({

        success: false,

        message:
          "Unable to retrieve MFA status",

      });

    }

  }
);

export default router;