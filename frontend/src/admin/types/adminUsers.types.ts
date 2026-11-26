export type UserStatus = "active" | "suspended";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: "user";
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  loginCount: number;
  suspendedAt: string | null;
}

export interface UserListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: "all" | UserStatus;
  sortBy?:
    | "name"
    | "email"
    | "createdAt"
    | "lastLoginAt"
    | "lastActiveAt"
    | "loginCount";
  sortOrder?: "asc" | "desc";
}

export interface Pagination {
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UserListResponse {
  users: ManagedUser[];

  pagination: Pagination & {
    totalUsers: number;
  };
}

export interface UserActivity {
  id: string;
  activityType: string;
  outcome: "success" | "failure";
  statusCode: number | null;
  durationMs: number | null;
  createdAt: string;
}

export interface UserActivityResponse {
  activities: UserActivity[];

  pagination: Pagination & {
    totalActivities: number;
  };

  retention: {
    days: number;
  };
}

export interface UserProfile {
  account: ManagedUser;

  resources: {
    totalResumes: number;
  };

  activity: {
    totalActivities: number;
    successfulActivities: number;
    failedActivities: number;
    successRate: number | null;
    averageDurationMs: number | null;
  };

  interviews: {
    totalInterviews: number;
    completedInterviews: number;
    inProgressInterviews: number;
    cancelledInterviews: number;
    completionRate: number | null;
    averageScore: number | null;
  };

  featureUsage: Array<{
    activityType: string;
    count: number;
  }>;

  recentActivities: UserActivity[];

  generatedAt: string;
}

export interface QuotaCounter {
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
}

export interface UserQuota {
  enabled: boolean;
  userId: string;
  total: QuotaCounter;

  features: Array<
    QuotaCounter & {
      feature: string;
    }
  >;

  resetAt: string;
  timezone: string;
}

export interface UserStatusResponse {
  user: ManagedUser;

  audit: {
    id: string;
    action: string;
    previousStatus: UserStatus;
    newStatus: UserStatus;
    createdAt: string;
  };
}