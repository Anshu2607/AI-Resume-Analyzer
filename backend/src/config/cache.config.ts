// =====================================
// CACHE CONFIGURATION
// =====================================

export const CACHE_CONFIG = {
  prefix: "careerlens:cache",

  version: "v1",

  defaultTTL: 300,

  maxValueBytes: 1024 * 1024,
} as const;

// =====================================
// CACHE EXPIRATION TIMES (SECONDS)
// =====================================

export const CACHE_TTL = {
  USER_PROFILE: 300,

  RESUME_LIST: 120,

  RESUME_ANALYSIS: 600,

  JOB_MATCH: 600,

  SKILL_GAP: 600,

  CAREER_ROADMAP: 300,

  INTERVIEW_REPORT: 900,

  DASHBOARD_STATS: 120,
} as const;

// =====================================
// CACHE RESOURCE TYPES
// =====================================

export const CACHE_RESOURCES = {
  USER_PROFILE: "user-profile",

  RESUME_LIST: "resume-list",

  RESUME_ANALYSIS: "resume-analysis",

  JOB_MATCH: "job-match",

  SKILL_GAP: "skill-gap",

  CAREER_ROADMAP: "career-roadmap",

  INTERVIEW_REPORT: "interview-report",

  DASHBOARD_STATS: "dashboard-stats",
} as const;

export type CacheResource =
  (typeof CACHE_RESOURCES)[keyof typeof CACHE_RESOURCES];