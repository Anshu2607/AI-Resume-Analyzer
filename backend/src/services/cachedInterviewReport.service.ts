import {
  CACHE_RESOURCES,
  CACHE_TTL,
} from "../config/cache.config.js";

import {
  createCacheKey,
  getOrSetCache,
  invalidateResourceCache,
} from "./cache.service.js";

import {
  getInterviewReport,
  generateInterviewReport,
} from "./interviewReport.service.js";

import {
  getInterviewSessionById,
} from "./interviewSession.service.js";

import type {
  InterviewReport,
} from "../validators/interview.validator.js";

// =====================================
// GET CACHED INTERVIEW REPORT
// =====================================

export const getCachedInterviewReport = async (
  userId: string,
  sessionId: string
): Promise<InterviewReport> => {

  // Verify ownership and resource existence
  // before accessing cached information.

  await getInterviewSessionById(
    userId,
    sessionId
  );

  const cacheKey = createCacheKey(
    CACHE_RESOURCES.INTERVIEW_REPORT,
    userId,
    sessionId.toLowerCase()
  );

  return getOrSetCache<InterviewReport>(
    cacheKey,

    async () => {
      return getInterviewReport(
        userId,
        sessionId
      );
    },

    CACHE_TTL.INTERVIEW_REPORT
  );
};

// =====================================
// INVALIDATE INTERVIEW REPORT CACHE
// =====================================

export const invalidateInterviewReportCache =
  async (
    userId: string,
    sessionId: string
  ): Promise<void> => {

    await invalidateResourceCache(
      CACHE_RESOURCES.INTERVIEW_REPORT,
      userId,
      sessionId.toLowerCase()
    );

  };

// =====================================
// GENERATE INTERVIEW REPORT
// =====================================

export const generateCachedInterviewReport =
  async (
    userId: string,
    sessionId: string
  ): Promise<InterviewReport> => {

    const report =
      await generateInterviewReport(
        userId,
        sessionId
      );

    await invalidateInterviewReportCache(
      userId,
      sessionId
    );

    return report;
  };