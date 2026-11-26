import adminApi from "./adminApi";

import type {
  AdminAPIResponse,
} from "../types/admin.types";

import type {
  AnalyticsDays,
  AnalyticsPeriod,
  AdminOverview,
  RegistrationAnalytics,
  EngagementAnalytics,
  FeatureAnalytics,
  AIUsageAnalytics,
  AdminDashboardData,
} from "../types/adminAnalytics.types";

export const adminAnalyticsService = {

  async getOverview(
    days: AnalyticsDays = 30,
    signal?: AbortSignal
  ): Promise<AdminOverview> {

    const response =
      await adminApi.get<
        AdminAPIResponse<AdminOverview>
      >("/analytics/overview", {
        params: { days },
        signal,
      });

    return response.data.data;
  },

  async getRegistrations(
    days: AnalyticsDays = 30,
    period: AnalyticsPeriod = "daily",
    signal?: AbortSignal
  ): Promise<RegistrationAnalytics> {

    const response =
      await adminApi.get<
        AdminAPIResponse<RegistrationAnalytics>
      >("/analytics/registrations", {
        params: { days, period },
        signal,
      });

    return response.data.data;
  },

  async getEngagement(
    days: AnalyticsDays = 30,
    period: AnalyticsPeriod = "daily",
    signal?: AbortSignal
  ): Promise<EngagementAnalytics> {

    const response =
      await adminApi.get<
        AdminAPIResponse<EngagementAnalytics>
      >("/analytics/engagement", {
        params: { days, period },
        signal,
      });

    return response.data.data;
  },

  async getFeatures(
    days: AnalyticsDays = 30,
    signal?: AbortSignal
  ): Promise<FeatureAnalytics> {

    const response =
      await adminApi.get<
        AdminAPIResponse<FeatureAnalytics>
      >("/analytics/features", {
        params: { days },
        signal,
      });

    return response.data.data;
  },

  async getAIUsage(
    days: AnalyticsDays = 30,
    signal?: AbortSignal
  ): Promise<AIUsageAnalytics> {

    const response =
      await adminApi.get<
        AdminAPIResponse<AIUsageAnalytics>
      >("/ai-usage", {
        params: { days },
        signal,
      });

    return response.data.data;
  },

  async getDashboard(
    days: AnalyticsDays = 30,
    signal?: AbortSignal
  ): Promise<AdminDashboardData> {

    const [
      overview,
      registrations,
      engagement,
      features,
      aiUsage,
    ] = await Promise.all([

      this.getOverview(days, signal),

      this.getRegistrations(
        days,
        "daily",
        signal
      ),

      this.getEngagement(
        days,
        "daily",
        signal
      ),

      this.getFeatures(days, signal),

      this.getAIUsage(days, signal),

    ]);

    return {
      overview,
      registrations,
      engagement,
      features,
      aiUsage,
    };
  },
};