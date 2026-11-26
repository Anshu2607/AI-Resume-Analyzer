import api from "./api";

import type {
  AuthResponse,
  ProfileResponse,
  LoginInput,
  RegisterInput,
} from "../types/auth.types";

export const authService = {
  register: async (
    data: RegisterInput
  ): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(
      "/auth/register",
      data
    );

    return response.data;
  },

  login: async (
    data: LoginInput
  ): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(
      "/auth/login",
      data
    );

    return response.data;
  },

  getProfile: async (): Promise<ProfileResponse> => {
    const response = await api.get<ProfileResponse>(
      "/auth/me"
    );

    return response.data;
  },
};