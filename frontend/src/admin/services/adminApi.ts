import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (
    import.meta.env.DEV
      ? "http://localhost:5000/api/v1"
      : "/api/v1"
  );

let adminAccessToken: string | null = null;

export const setAdminAccessToken = (
  token: string | null
): void => {

  adminAccessToken = token;
};

export const ADMIN_SESSION_EXPIRED_EVENT =
  "careerlens:admin-session-expired";

const adminApi = axios.create({

  baseURL:
    `${API_BASE_URL.replace(/\/+$/, "")}/admin`,

  timeout: 30000,

  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

adminApi.interceptors.request.use(
  (config) => {

    if (
      adminAccessToken &&
      !config.url?.startsWith("/auth/")
    ) {

      config.headers.Authorization =
        `Bearer ${adminAccessToken}`;
    }

    return config;
  }
);

adminApi.interceptors.response.use(

  (response) => response,

  (error) => {

    const status =
      error.response?.status;

    const requestUrl =
      error.config?.url ?? "";

    if (
      status === 401 &&
      !requestUrl.startsWith("/auth/")
    ) {

      adminAccessToken = null;

      window.dispatchEvent(
        new Event(
          ADMIN_SESSION_EXPIRED_EVENT
        )
      );
    }

    return Promise.reject(error);
  }
);

export const getAdminErrorMessage = (
  error: unknown
): string => {

  if (axios.isAxiosError(error)) {

    const message =
      error.response?.data?.message;

    if (typeof message === "string") {
      return message;
    }

    if (error.code === "ECONNABORTED") {

      return "Request timed out. Please try again.";
    }

    if (!error.response) {

      return "Unable to connect to the server.";
    }
  }

  return "Something went wrong. Please try again.";
};

export default adminApi;