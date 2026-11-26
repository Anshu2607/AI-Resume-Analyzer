import User from "../models/user.model.js";

import {
  ADMIN_USER_MANAGEMENT_CONFIG,
} from "../config/adminUserManagement.config.js";

import type {
  AdminUserListQuery,
} from "../validators/adminUserManagement.validator.js";

// =====================================
// USER MANAGEMENT ERROR
// =====================================

export class AdminUserManagementError extends Error {

  constructor(
    message: string,
    public statusCode: number
  ) {

    super(message);

    this.name = "AdminUserManagementError";

  }

}

// =====================================
// USER FILTER INTERFACE
// =====================================

interface AdminUserFilter {

  role: "user";

  status?: "active" | "suspended";

  $or?: Array<
    | { name: RegExp }
    | { email: RegExp }
  >;

}

// =====================================
// SAFE USER FIELD PROJECTION
// =====================================

const USER_PROJECTION =

  "_id name email role status " +

  "createdAt updatedAt lastLoginAt " +

  "lastActiveAt loginCount suspendedAt";

// =====================================
// ESCAPE REGULAR EXPRESSION
// =====================================

const escapeRegex = (
  value: string
): string => {

  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

};

// =====================================
// BUILD USER SEARCH FILTER
// =====================================

const buildUserFilter = (

  query: AdminUserListQuery

): AdminUserFilter => {

  // Never include administrator accounts.

  const filter: AdminUserFilter = {

    role: "user",

  };

  // Filter by account status.

  if (query.status !== "all") {

    filter.status = query.status;

  }

  // Search by name or email.

  if (query.search.trim()) {

    const searchTerm =
      escapeRegex(query.search.trim());

    const searchRegex =
      new RegExp(searchTerm, "i");

    filter.$or = [

      {
        name: searchRegex,
      },

      {
        email: searchRegex,
      },

    ];

  }

  return filter;

};

// =====================================
// LIST REGISTERED USERS
// =====================================

export const getAdminUsers = async (

  query: AdminUserListQuery

) => {

  const {

    page,

    limit,

    sortBy,

    sortOrder,

  } = query;

  // ===================================
  // BUILD FILTER AND PAGINATION
  // ===================================

  const filter =
    buildUserFilter(query);

  const skip =
    (page - 1) * limit;

  const sortDirection: 1 | -1 =

    sortOrder === "asc"

      ? 1

      : -1;

  const sortOptions: Record<string, 1 | -1> = {

    [sortBy]: sortDirection,

    _id: sortDirection,

  };

  // ===================================
  // EXECUTE DATABASE QUERIES
  // ===================================

  const [

    users,

    totalUsers,

  ] = await Promise.all([

    User.find(filter)

      .select(USER_PROJECTION)

      .sort(sortOptions)

      .skip(skip)

      .limit(limit)

      .maxTimeMS(

        ADMIN_USER_MANAGEMENT_CONFIG
          .queryTimeoutMs

      )

      .lean()

      .exec(),

    User.countDocuments(filter)

      .maxTimeMS(

        ADMIN_USER_MANAGEMENT_CONFIG
          .queryTimeoutMs

      )

      .exec(),

  ]);

  // ===================================
  // FORMAT SAFE USER RESPONSE
  // ===================================

  const formattedUsers =
    users.map((user) => ({

      id: user._id.toString(),

      name: user.name,

      email: user.email,

      role: user.role,

      status: user.status,

      createdAt: user.createdAt,

      updatedAt: user.updatedAt,

      lastLoginAt:
        user.lastLoginAt ?? null,

      lastActiveAt:
        user.lastActiveAt ?? null,

      loginCount:
        user.loginCount ?? 0,

      suspendedAt:
        user.suspendedAt ?? null,

    }));

  // ===================================
  // CALCULATE PAGINATION
  // ===================================

  const totalPages =
    Math.ceil(totalUsers / limit);

  // ===================================
  // RETURN USER DIRECTORY
  // ===================================

  return {

    users: formattedUsers,

    pagination: {

      page,

      limit,

      totalUsers,

      totalPages,

      hasNextPage:
        page < totalPages,

      hasPreviousPage:
        page > 1 && totalPages > 0,

    },

    filters: {

      search: query.search,

      status: query.status,

      sortBy,

      sortOrder,

    },

  };

};