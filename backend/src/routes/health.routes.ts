import { Router } from "express";

import {
  getLivenessStatus,
  getReadinessStatus,
} from "../services/health.service.js";

const router = Router();

// =====================================
// LIVENESS ENDPOINT
// =====================================

router.get("/health", (_req, res) => {

  res.status(200).json(
    getLivenessStatus()
  );

});

// =====================================
// READINESS ENDPOINT
// =====================================

router.get("/ready", async (_req, res) => {

  try {

    const result =
      await getReadinessStatus();

    res.status(
      result.success ? 200 : 503
    ).json({
      success: result.success,
      status: result.status,
      timestamp: result.timestamp,
    });

  } catch {

    res.status(503).json({
      success: false,

      status: "not_ready",

      timestamp: new Date().toISOString(),
    });

  }

});

export default router;