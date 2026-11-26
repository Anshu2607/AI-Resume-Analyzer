import mongoose, {
  Schema,
  Document,
  Types,
} from "mongoose";

export interface IResume extends Document {
  userId: Types.ObjectId;
  originalName: string;
  mimeType: string;
  fileSize: number;
  extractedText: string;
  pageCount: number;
  status: "uploaded" | "processing" | "processed" | "failed";
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const resumeSchema = new Schema<IResume>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
      enum: ["application/pdf"],
    },

    fileSize: {
      type: Number,
      required: true,
      min: 1,
      max: 5 * 1024 * 1024,
    },

    extractedText: {
      type: String,
      default: "",
      select: false,
    },

    pageCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "uploaded",
        "processing",
        "processed",
        "failed",
      ],
      default: "uploaded",
    },

    errorMessage: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize user-specific resume history queries
resumeSchema.index({
  userId: 1,
  createdAt: -1,
});

const Resume = mongoose.model<IResume>(
  "Resume",
  resumeSchema
);

export default Resume;