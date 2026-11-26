import adminApi from "./adminApi";

import type {
  AdminAPIResponse,
} from "../types/admin.types";

import type {
  SystemHealth,
} from "../types/adminSystem.types";

export const adminSystemService = {

  async getHealth(
    signal?: AbortSignal
  ): Promise<SystemHealth> {

    const response = await adminApi.get<
      AdminAPIResponse<SystemHealth>
    >("/system-health", {
      signal,
    });

    return response.data.data;
  },
};