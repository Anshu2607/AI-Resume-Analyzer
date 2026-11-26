import type { RequestHandler } from "express";

import type {
  AuthenticatedRequest,
} from "./auth.middleware.js";

import {
  runWithAIUsageContext,
} from "../utils/aiUsageContext.utils.js";

import {
  AI_USAGE_FEATURES,
} from "../config/aiUsage.config.js";

import type {
  AIUsageFeature,
} from "../config/aiUsage.config.js";

import {
  getRequestId,
} from "../utils/logger.utils.js";

// =====================================
// IDENTIFY AI FEATURE FROM API PATH
// =====================================

const resolveFeature = (
  url: string
): AIUsageFeature => {

  const path = url
    .split("?")[0]
    .toLowerCase();

  if (path.includes("/analyses")) {
    return AI_USAGE_FEATURES.RESUME_ANALYSIS;
  }

  if (path.includes("/conversations")) {
    return AI_USAGE_FEATURES.RAG_ASSISTANT;
  }

  if (path.includes("/job-matches")) {
    return AI_USAGE_FEATURES.JOB_MATCHING;
  }

  if (
    path.includes("/roadmaps") ||
    path.includes("/skill-gaps")
  ) {
    return AI_USAGE_FEATURES.CAREER_ROADMAP;
  }

  if (path.includes("/agents")) {
    return AI_USAGE_FEATURES.AGENT_EXECUTION;
  }

  if (path.includes("/interviews")) {

    if (path.includes("/report")) {
      return AI_USAGE_FEATURES.INTERVIEW_REPORT;
    }

    if (
      path.includes("/answer") ||
      path.includes("/skip")
    ) {
      return AI_USAGE_FEATURES.INTERVIEW_EVALUATION;
    }

    return AI_USAGE_FEATURES.INTERVIEW_QUESTION;
  }

  if (path.includes("/jobs/interview-report")) {
    return AI_USAGE_FEATURES.INTERVIEW_REPORT;
  }

  return AI_USAGE_FEATURES.UNKNOWN;
};

// =====================================
// ATTACH AUTHENTICATED USER CONTEXT
// =====================================

export const attachAIUsageContext: RequestHandler =
  (request, res, next) => {

    const req =
      request as AuthenticatedRequest;

    if (
      !req.user?.userId ||
      req.user.role !== "user"
    ) {
      next();
      return;
    }

    runWithAIUsageContext(
      {
        userId: req.user.userId,

        feature: resolveFeature(
          req.originalUrl
        ),

        requestId: getRequestId(res),
      },
      () => next()
    );
  };