import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  const connection = await mongoose.connect(uri);

  console.log(
    `MongoDB connected: ${connection.connection.name}`
  );
};