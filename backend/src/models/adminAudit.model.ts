import mongoose, {
  Schema,
  Document,
  Types,
} from "mongoose";

export const ADMIN_AUDIT_ACTIONS = {

  USER_SUSPENDED: "USER_SUSPENDED",

  USER_REACTIVATED: "USER_REACTIVATED",

} as const;

export type AdminAuditAction =
  typeof ADMIN_AUDIT_ACTIONS[
    keyof typeof ADMIN_AUDIT_ACTIONS
  ];

export interface IAdminAudit extends Document {

  adminId: Types.ObjectId;

  targetUserId: Types.ObjectId;

  action: AdminAuditAction;

  reason: string;

  previousStatus: "active" | "suspended";

  newStatus: "active" | "suspended";

  requestId: string | null;

  createdAt: Date;

}

const adminAuditSchema = new Schema<IAdminAudit>(

  {

    adminId: {

      type: Schema.Types.ObjectId,

      ref: "User",

      required: true,

      immutable: true,

    },

    targetUserId: {

      type: Schema.Types.ObjectId,

      ref: "User",

      required: true,

      immutable: true,

    },

    action: {

      type: String,

      enum: Object.values(ADMIN_AUDIT_ACTIONS),

      required: true,

      immutable: true,

    },

    reason: {

      type: String,

      required: true,

      trim: true,

      minlength: 5,

      maxlength: 500,

      immutable: true,

    },

    previousStatus: {

      type: String,

      enum: ["active", "suspended"],

      required: true,

      immutable: true,

    },

    newStatus: {

      type: String,

      enum: ["active", "suspended"],

      required: true,

      immutable: true,

    },

    requestId: {

      type: String,

      maxlength: 100,

      default: null,

      immutable: true,

    },

    createdAt: {

      type: Date,

      default: Date.now,

      required: true,

      immutable: true,

    },

  },

  {

    versionKey: false,

    timestamps: false,

  }

);

adminAuditSchema.index({

  adminId: 1,

  createdAt: -1,

});

adminAuditSchema.index({

  targetUserId: 1,

  createdAt: -1,

});

adminAuditSchema.index({

  action: 1,

  createdAt: -1,

});

adminAuditSchema.index({

  createdAt: -1,

});

const AdminAudit =
  mongoose.model<IAdminAudit>(

    "AdminAudit",

    adminAuditSchema

  );

export default AdminAudit;