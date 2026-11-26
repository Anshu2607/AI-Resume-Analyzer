import adminApi from "./adminApi";

import type {
  AdminAPIResponse,
} from "../types/admin.types";

import type {
  UserListQuery,
  UserListResponse,
  UserProfile,
  UserActivityResponse,
  UserQuota,
  UserStatusResponse,
} from "../types/adminUsers.types";

export const adminUsersService = {

  async getUsers(
    query: UserListQuery,
    signal?: AbortSignal
  ): Promise<UserListResponse> {

    const response =
      await adminApi.get<
        AdminAPIResponse<UserListResponse>
      >("/users", {
        params: query,
        signal,
      });

    return response.data.data;
  },

  async getProfile(
    userId: string,
    signal?: AbortSignal
  ): Promise<UserProfile> {

    const response =
      await adminApi.get<
        AdminAPIResponse<UserProfile>
      >(`/users/${userId}`, {
        signal,
      });

    return response.data.data;
  },

  async getActivities(
    userId: string,
    query: {
      page: number;
      limit: number;
      activityType?: string;
      outcome?: "success" | "failure";
    },
    signal?: AbortSignal
  ): Promise<UserActivityResponse> {

    const response =
      await adminApi.get<
        AdminAPIResponse<UserActivityResponse>
      >(`/users/${userId}/activities`, {
        params: query,
        signal,
      });

    return response.data.data;
  },

  async getQuota(
    userId: string,
    signal?: AbortSignal
  ): Promise<UserQuota> {

    const response =
      await adminApi.get<
        AdminAPIResponse<UserQuota>
      >(`/ai-quota/${userId}`, {
        signal,
      });

    return response.data.data;
  },

  async suspend(
    userId: string,
    reason: string
  ): Promise<UserStatusResponse> {

    const response =
      await adminApi.patch<
        AdminAPIResponse<UserStatusResponse>
      >(`/users/${userId}/suspend`, {
        reason,
      });

    return response.data.data;
  },

  async reactivate(
    userId: string,
    reason: string
  ): Promise<UserStatusResponse> {

    const response =
      await adminApi.patch<
        AdminAPIResponse<UserStatusResponse>
      >(`/users/${userId}/reactivate`, {
        reason,
      });

    return response.data.data;
  },
};