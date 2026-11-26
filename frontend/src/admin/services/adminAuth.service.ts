import adminApi from "./adminApi";

import type {
  AdminAPIResponse,
  AdminLoginInput,
  AdminLoginChallenge,
  AdminMFAVerificationInput,
  AdminSession,
  AdminUser,
  AdminAccessVerification,
} from "../types/admin.types";

interface AdminLogoutResponse {
  loggedOut: boolean;
  revokedAt: string;
}

export const adminAuthService = {

  async login(
    credentials: AdminLoginInput
  ): Promise<AdminLoginChallenge> {

    const response = await adminApi.post<
      AdminAPIResponse<AdminLoginChallenge>
    >(
      "/auth/login",
      credentials
    );

    return response.data.data;
  },

  async verifyMFA(
    input: AdminMFAVerificationInput
  ): Promise<AdminSession> {

    const response = await adminApi.post<
      AdminAPIResponse<AdminSession>
    >(
      "/auth/mfa/verify",
      input
    );

    return response.data.data;
  },

  async verifyAccess():
    Promise<AdminAccessVerification> {

    const response = await adminApi.get<
      AdminAPIResponse<AdminAccessVerification>
    >("/verify");

    return response.data.data;
  },

  async getProfile(): Promise<AdminUser> {

    const response = await adminApi.get<
      AdminAPIResponse<AdminUser>
    >("/profile");

    return response.data.data;
  },

  async logout(): Promise<AdminLogoutResponse> {

    const response = await adminApi.post<
      AdminAPIResponse<AdminLogoutResponse>
    >(
      "/session/logout",
      {},
      {
        timeout: 10000,
      }
    );

    if (
      response.data.data.loggedOut !== true
    ) {

      throw new Error(
        "Administrator logout could not be confirmed"
      );

    }

    return response.data.data;
  },

};