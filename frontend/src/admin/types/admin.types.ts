export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin";
  status: "active" | "suspended";
  createdAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  loginCount: number;
}

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminLoginChallenge {
  mfaRequired: boolean;
  setupRequired: boolean;
  challengeToken: string;
  expiresIn: number;
}

export interface AdminMFAVerificationInput {
  challengeToken: string;
  otp: string;
}

export interface AdminSession {
  user: AdminUser;
  token: string;
  tokenType: "Bearer";
  expiresIn: number;
  mfaVerified: boolean;
}

export interface AdminAccessVerification {
  userId: string;
  role: "admin";
  sessionType: "admin";
  mfaVerified: boolean;
}

export interface AdminAPIResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface AdminAuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  expiresAt: number | null;
}