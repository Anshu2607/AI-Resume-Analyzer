import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  const uri =
    process.env.MONGODB_URI?.trim() ||
    process.env.MONGO_URI?.trim();

  if (!uri) {
    throw new Error(
      "MongoDB connection URI is not configured"
    );
  }

  console.log("Connecting to MongoDB...");

  try {
    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log(
      `MongoDB connected: ${connection.connection.name}`
    );

  } catch (error) {
    console.error("MongoDB connection failed:", {
      errorName:
        error instanceof Error
          ? error.name
          : "UnknownError",

      errorCode:
        error instanceof Error && "code" in error
          ? error.code
          : "UNKNOWN",
    });

    throw error;
  }
};