import type {
  Pagination,
  UserStatus,
} from "./adminUsers.types";

export type AuditAction =
  | "USER_SUSPENDED"
  | "USER_REACTIVATED";

export interface AuditRecord {

  id: string;

  adminId: string;

  targetUserId: string;

  action: AuditAction;

  reason: string;

  previousStatus: UserStatus;

  newStatus: UserStatus;

  requestId: string | null;

  createdAt: string;
}

export interface AuditQuery {

  page: number;

  limit: number;

  action?: AuditAction;

  targetUserId?: string;
}

export interface AuditResponse {

  records: AuditRecord[];

  pagination: Pagination & {

    totalRecords: number;

  };

  generatedAt: string;
}