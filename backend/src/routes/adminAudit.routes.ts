import { Router } from "express";
import { z } from "zod";

import AdminAudit from "../models/adminAudit.model.js";

import {
  createDistributedRateLimiter,
} from "../middleware/rateLimit.middleware.js";

const router = Router();

const limiter = createDistributedRateLimiter({
  name: "admin-audit-logs",
  windowMs: 60000,
  max: 60,
  message: "Too many audit log requests",
});

const querySchema = z.object({

  page: z.coerce.number()
    .int()
    .min(1)
    .max(10000)
    .default(1),

  limit: z.coerce.number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  action: z.enum([
    "USER_SUSPENDED",
    "USER_REACTIVATED",
  ]).optional(),

  targetUserId: z.string()
    .regex(/^[a-fA-F0-9]{24}$/)
    .optional(),

}).strict();

router.get("/", limiter, async (req, res) => {

  res.setHeader("Cache-Control", "no-store");

  const parsed = querySchema.safeParse(req.query);

  if (!parsed.success) {

    res.status(400).json({
      success: false,
      message: "Invalid audit log query",
    });

    return;
  }

  const {
    page,
    limit,
    action,
    targetUserId,
  } = parsed.data;

  const filter = {

    ...(action ? { action } : {}),

    ...(targetUserId
      ? { targetUserId }
      : {}),

  };

  try {

    const [records, totalRecords] =
      await Promise.all([

        AdminAudit.find(filter)
          .select(
            "_id adminId targetUserId action reason " +
            "previousStatus newStatus requestId createdAt"
          )
          .sort({
            createdAt: -1,
            _id: -1,
          })
          .skip((page - 1) * limit)
          .limit(limit)
          .maxTimeMS(10000)
          .lean(),

        AdminAudit.countDocuments(filter)
          .maxTimeMS(10000),

      ]);

    const totalPages =
      Math.ceil(totalRecords / limit);

    res.status(200).json({

      success: true,

      message: "Audit logs retrieved successfully",

      data: {

        records: records.map((record) => ({

          id: record._id.toString(),

          adminId: record.adminId.toString(),

          targetUserId:
            record.targetUserId.toString(),

          action: record.action,

          reason: record.reason,

          previousStatus: record.previousStatus,

          newStatus: record.newStatus,

          requestId: record.requestId ?? null,

          createdAt: record.createdAt,

        })),

        pagination: {

          page,
          limit,
          totalRecords,
          totalPages,

          hasNextPage: page < totalPages,

          hasPreviousPage: page > 1,

        },

        generatedAt: new Date().toISOString(),

      },

    });

  } catch {

    res.status(500).json({

      success: false,

      message: "Unable to retrieve audit logs",

    });
  }
});

export default router;