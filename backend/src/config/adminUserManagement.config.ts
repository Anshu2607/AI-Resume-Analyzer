// =====================================
// USER MANAGEMENT CONFIGURATION
// =====================================

export const ADMIN_USER_MANAGEMENT_CONFIG = {

  pagination: {

    defaultPage: 1,

    defaultLimit: 20,

    maxLimit: 100,

    maxPage: 10000,

  },

  search: {

    maxLength: 100,

  },

  suspension: {

    minReasonLength: 5,

    maxReasonLength: 500,

  },

  queryTimeoutMs: 10000,

  rateLimit: {

    read: {

      windowMs: 60 * 1000,

      max: 60,

    },

    write: {

      windowMs: 60 * 1000,

      max: 10,

    },

  },

} as const;

// =====================================
// USER STATUS FILTERS
// =====================================

export const ADMIN_USER_STATUS_FILTERS = [

  "all",

  "active",

  "suspended",

] as const;

export type AdminUserStatusFilter =
  typeof ADMIN_USER_STATUS_FILTERS[number];

// =====================================
// ALLOWED SORT FIELDS
// =====================================

export const ADMIN_USER_SORT_FIELDS = [

  "name",

  "email",

  "createdAt",

  "lastLoginAt",

  "lastActiveAt",

  "loginCount",

] as const;

export type AdminUserSortField =
  typeof ADMIN_USER_SORT_FIELDS[number];

// =====================================
// SORT ORDER
// =====================================

export const ADMIN_USER_SORT_ORDERS = [

  "asc",

  "desc",

] as const;

export type AdminUserSortOrder =
  typeof ADMIN_USER_SORT_ORDERS[number];