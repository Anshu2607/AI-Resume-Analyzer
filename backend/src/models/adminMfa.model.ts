import mongoose, {
  Schema,
  Document,
  Types,
} from "mongoose";

// =====================================
// ADMIN MFA INTERFACE
// =====================================

export interface IAdminMfa extends Document {

  userId: Types.ObjectId;

  encryptedSecret: string;

  enabled: boolean;

  verifiedAt: Date | null;

  lastUsedAt: Date | null;

  lastUsedTimeStep: number | null;

  createdAt: Date;

  updatedAt: Date;

}

// =====================================
// ADMIN MFA SCHEMA
// =====================================

const adminMfaSchema = new Schema<IAdminMfa>(

  {

    userId: {

      type: Schema.Types.ObjectId,

      ref: "User",

      required: true,

      unique: true,

      immutable: true,

    },

    encryptedSecret: {

      type: String,

      required: true,

      select: false,

    },

    enabled: {

      type: Boolean,

      default: false,

      required: true,

    },

    verifiedAt: {

      type: Date,

      default: null,

    },

    lastUsedAt: {

      type: Date,

      default: null,

    },

    lastUsedTimeStep: {

      type: Number,

      default: null,

      select: false,

    },

  },

  {

    timestamps: true,

  }

);

// =====================================
// ADMIN MFA MODEL
// =====================================

const AdminMfa = mongoose.model<IAdminMfa>(

  "AdminMfa",

  adminMfaSchema

);

export default AdminMfa;