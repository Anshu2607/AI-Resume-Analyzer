import axios from "axios";

// =====================================
// API BASE URL
// =====================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5000/api/v1"
    : "/api/v1");

// =====================================
// AXIOS CLIENT
// =====================================

const api = axios.create({
  baseURL: API_BASE_URL,

  timeout: 15000,

  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================
// JWT REQUEST INTERCEPTOR
// =====================================

api.interceptors.request.use(
  (config) => {

    const token = localStorage.getItem(
      "careerlens_token"
    );

    if (token) {

      config.headers.Authorization =
        `Bearer ${token}`;

    }

    return config;
  },

  (error) => Promise.reject(error)
);

export default api;