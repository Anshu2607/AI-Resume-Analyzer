import mongoose, { Schema, Types } from "mongoose";

export interface IConversation {
  userId: Types.ObjectId;
  resumeId: Types.ObjectId;
  title: string;
  status: "active" | "archived";
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    resumeId: {
      type: Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      default: "New Career Conversation",
    },

    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },

    messageCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "conversations",
  }
);

// Retrieve a user's recent conversations
conversationSchema.index({
  userId: 1,
  lastMessageAt: -1,
});

// Retrieve conversations associated with a resume
conversationSchema.index({
  userId: 1,
  resumeId: 1,
  lastMessageAt: -1,
});

const Conversation =
  mongoose.model<IConversation>(
    "Conversation",
    conversationSchema
  );

export default Conversation;