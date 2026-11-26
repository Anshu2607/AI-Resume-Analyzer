import adminApi from "./adminApi";

import type {
  AdminAPIResponse,
} from "../types/admin.types";

import type {
  AuditQuery,
  AuditResponse,
} from "../types/adminAudit.types";

export const adminAuditService = {

  async getAuditLogs(
    query: AuditQuery,
    signal?: AbortSignal
  ): Promise<AuditResponse> {

    const response = await adminApi.get<
      AdminAPIResponse<AuditResponse>
    >("/audit-logs", {

      params: query,

      signal,

    });

    return response.data.data;
  },

};