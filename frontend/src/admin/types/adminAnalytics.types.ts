export type AnalyticsDays = 7 | 14 | 30 | 60 | 90;

export type AnalyticsPeriod =
  "daily" | "weekly" | "monthly";

export interface AnalyticsDateRange {
  days: number;
  startDate: string;
  endDate: string;
  timezone: string;
}

export interface AccountMetrics {
  totalUsers: number;
  enabledAccounts: number;
  suspendedAccounts: number;
}

export interface RegistrationMetrics {
  today: number;
  thisWeek: number;
  thisMonth: number;
  selectedPeriod: number;
  previousPeriod: number;
  growthPercentage: number | null;
}

export interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  engagementRate: number;
  dauMauRatio: number;
}

export interface FeatureSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number | null;
  mostUsedFeature: unknown;
}

export interface PerformanceSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  clientErrors: number;
  serverErrors: number;
  rateLimitedRequests: number;
  averageDurationMs: number | null;
  minimumDurationMs: number | null;
  maximumDurationMs: number | null;
  successRate: number | null;
  failureRate: number | null;
}

export interface InterviewSummary {
  totalInterviews: number;
  completedInterviews: number;
  inProgressInterviews: number;
  cancelledInterviews: number;
  completionRate: number | null;
  totalAnswers: number;
  totalSkippedQuestions: number;
  answerRate: number | null;
  averageScore: number | null;
  completedDuringRange: number;
}

export interface BackgroundJobSummary {
  submittedJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalOutcomeEvents: number;
  successRate: number | null;
  failureRate: number | null;
  averageSubmissionDurationMs: number | null;
  averageProcessingDurationMs: number | null;
  maximumProcessingDurationMs: number | null;
}

export interface AdminOverview {
  users: {
    accounts: AccountMetrics;
    registrations: RegistrationMetrics;
    engagement: EngagementMetrics;
  };

  features: FeatureSummary;

  performance: PerformanceSummary;

  interviews: InterviewSummary;

  backgroundJobs: BackgroundJobSummary;

  dateRange: AnalyticsDateRange;

  generatedAt: string;
}

export interface AnalyticsTrendPoint {
  date: string;
  count: number;
}

export interface RegistrationAnalytics {
  summary: {
    totalRegistrations: number;
    previousPeriodRegistrations: number;
    growthPercentage: number | null;
    averageDailyRegistrations: number;
    peakPeriod: unknown;
  };

  trend: AnalyticsTrendPoint[];

  dateRange: AnalyticsDateRange;

  generatedAt: string;
}

export interface EngagementAnalytics {
  summary: {
    totalUsers: number;
    uniqueEngagedUsers: number;
    engagementRate: number;
    averageEngagedUsersPerPeriod: number;
    peakEngagementPeriod: unknown;
  };

  trend: AnalyticsTrendPoint[];

  dateRange: AnalyticsDateRange;

  generatedAt: string;
}

export interface FeatureMetric {
  activityType: string;
  label: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  uniqueUsers: number;
  successRate: number | null;
  averageDurationMs: number | null;
  usagePercentage: number;
}

export interface FeatureAnalytics {
  summary: FeatureSummary;
  features: FeatureMetric[];
  dateRange: AnalyticsDateRange;
  generatedAt: string;
}

export interface AIUsageMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  fallbackAttempts: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number | null;
  measuredAttempts: number;
  unmeasuredAttempts: number;
  pricedAttempts: number;
  unpricedAttempts: number;
  estimatedCostUsd: number | null;
  averageDurationMs: number | null;
  successRate: number | null;
  tokenMeasurementCoverage: number | null;
  pricingCoverage: number | null;
}

export interface AIUsageAnalytics {
  summary: AIUsageMetrics;

  providers: Array<
    AIUsageMetrics & {
      provider: string;
    }
  >;

  models: Array<
    AIUsageMetrics & {
      provider: string;
      model: string;
    }
  >;

  features: Array<
    AIUsageMetrics & {
      feature: string;
    }
  >;

  trend: Array<
    AIUsageMetrics & {
      date: string;
    }
  >;

  currency: string;
  retentionDays: number;
  generatedAt: string;
}

export interface AdminDashboardData {
  overview: AdminOverview;
  registrations: RegistrationAnalytics;
  engagement: EngagementAnalytics;
  features: FeatureAnalytics;
  aiUsage: AIUsageAnalytics;
}