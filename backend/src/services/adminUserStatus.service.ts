import mongoose, {
  Types,
} from "mongoose";

import User from "../models/user.model.js";

import AdminMfa from "../models/adminMfa.model.js";

import AdminAudit, {
  ADMIN_AUDIT_ACTIONS,
} from "../models/adminAudit.model.js";

import {
  AdminUserManagementError,
} from "./adminUserManagement.service.js";

import {
  ADMIN_USER_MANAGEMENT_CONFIG,
} from "../config/adminUserManagement.config.js";

type AccountStatus =
  "active" | "suspended";

interface ChangeUserStatusInput {

  adminId: string;

  userId: string;

  reason: string;

  requestId?: string;

}

const OBJECT_ID_PATTERN =
  /^[a-fA-F0-9]{24}$/;

// =====================================
// CHANGE USER ACCOUNT STATUS
// =====================================

const changeUserStatus = async (

  input: ChangeUserStatusInput,

  newStatus: AccountStatus

) => {

  if (

    !OBJECT_ID_PATTERN.test(input.adminId) ||

    !OBJECT_ID_PATTERN.test(input.userId)

  ) {

    throw new AdminUserManagementError(
      "Invalid account identifier",
      400
    );

  }

  const adminId =
    new Types.ObjectId(input.adminId);

  const userId =
    new Types.ObjectId(input.userId);

  if (adminId.equals(userId)) {

    throw new AdminUserManagementError(
      "Administrators cannot modify their own account status",
      403
    );

  }

  const reason = input.reason.trim();

  const reasonConfig =
    ADMIN_USER_MANAGEMENT_CONFIG.suspension;

  if (

    reason.length < reasonConfig.minReasonLength ||

    reason.length > reasonConfig.maxReasonLength

  ) {

    throw new AdminUserManagementError(
      "Invalid reason length",
      400
    );

  }

  const requestId =

    typeof input.requestId === "string" &&

    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
      .test(input.requestId)

      ? input.requestId

      : null;

  const previousStatus: AccountStatus =

    newStatus === "suspended"

      ? "active"

      : "suspended";

  const action =

    newStatus === "suspended"

      ? ADMIN_AUDIT_ACTIONS.USER_SUSPENDED

      : ADMIN_AUDIT_ACTIONS.USER_REACTIVATED;

  const session =
    await mongoose.startSession();

  try {

    const result = await session.withTransaction(

      async () => {

        // =================================
        // VERIFY ADMINISTRATOR PERMISSIONS
        // =================================

        const administrator = await User.exists({

          _id: adminId,

          role: "admin",

          status: "active",

        }).session(session);

        if (!administrator) {

          throw new AdminUserManagementError(
            "Administrator account is unavailable",
            403
          );

        }

        const mfaEnabled = await AdminMfa.exists({

          userId: adminId,

          enabled: true,

        }).session(session);

        if (!mfaEnabled) {

          throw new AdminUserManagementError(
            "Administrator MFA is required",
            403
          );

        }

        // =================================
        // VERIFY TARGET USER
        // =================================

        const targetUser = await User.findOne({

          _id: userId,

          role: "user",

        })

          .select("_id status sessionVersion")

          .session(session)

          .lean();

        if (!targetUser) {

          throw new AdminUserManagementError(
            "User not found",
            404
          );

        }

        if (targetUser.status === newStatus) {

          throw new AdminUserManagementError(

            newStatus === "suspended"

              ? "User account is already suspended"

              : "User account is already active",

            409

          );

        }

        if (targetUser.status !== previousStatus) {

          throw new AdminUserManagementError(
            "Invalid account status transition",
            409
          );

        }

        const currentVersion =
          targetUser.sessionVersion === undefined

            ? 0

            : targetUser.sessionVersion;

        if (

          !Number.isSafeInteger(currentVersion) ||

          currentVersion < 0 ||

          currentVersion >= Number.MAX_SAFE_INTEGER

        ) {

          throw new AdminUserManagementError(
            "Invalid account session configuration",
            500
          );

        }

        const now = new Date();

        // =================================
        // UPDATE STATUS AND REVOKE SESSIONS
        // =================================

        const updatedUser =
          await User.findOneAndUpdate(

            {

              _id: userId,

              role: "user",

              status: previousStatus,

              $or: [

                {
                  sessionVersion: currentVersion,
                },

                ...(currentVersion === 0

                  ? [
                      {
                        sessionVersion: {
                          $exists: false,
                        },
                      },
                    ]

                  : []),

              ],

            },

            {

              $set: {

                status: newStatus,

                suspendedAt:

                  newStatus === "suspended"

                    ? now

                    : null,

                // Invalidate all previous tokens
                // on suspension and reactivation.

                sessionVersion:
                  currentVersion + 1,

              },

            },

            {

              new: true,

              runValidators: true,

              session,

            }

          )

            .select(

              "_id name email role status " +

              "createdAt updatedAt suspendedAt"

            )

            .lean();

        if (!updatedUser) {

          throw new AdminUserManagementError(
            "Account status changed during processing",
            409
          );

        }

        // =================================
        // CREATE TRANSACTIONAL AUDIT RECORD
        // =================================

        const [auditRecord] =
          await AdminAudit.create(

            [

              {

                adminId,

                targetUserId: userId,

                action,

                reason,

                previousStatus,

                newStatus,

                requestId,

                createdAt: now,

              },

            ],

            { session }

          );

        if (!auditRecord) {

          throw new Error(
            "Unable to create administrator audit record"
          );

        }

        return {

          user: {

            id: updatedUser._id.toString(),

            name: updatedUser.name,

            email: updatedUser.email,

            role: updatedUser.role,

            status: updatedUser.status,

            createdAt: updatedUser.createdAt,

            updatedAt: updatedUser.updatedAt,

            suspendedAt:
              updatedUser.suspendedAt ?? null,

          },

          audit: {

            id: auditRecord._id.toString(),

            action,

            previousStatus,

            newStatus,

            createdAt: now,

          },

        };

      },

      {

        readConcern: {
          level: "snapshot",
        },

        writeConcern: {
          w: "majority",
        },

        readPreference: "primary",

      }

    );

    if (!result) {

      throw new AdminUserManagementError(
        "Unable to complete account status update",
        500
      );

    }

    return result;

  } finally {

    await session.endSession();

  }
};

// =====================================
// SUSPEND REGULAR USER
// =====================================

export const suspendAdminUser = async (
  input: ChangeUserStatusInput
) => {

  return changeUserStatus(
    input,
    "suspended"
  );
};

// =====================================
// REACTIVATE REGULAR USER
// =====================================

export const reactivateAdminUser = async (
  input: ChangeUserStatusInput
) => {

  return changeUserStatus(
    input,
    "active"
  );
};