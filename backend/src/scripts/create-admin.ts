import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../models/user.model.js";

dotenv.config();

// =====================================
// DATABASE CONFIGURATION
// =====================================

const mongoUri =
  process.env.MONGODB_URI?.trim() ||
  process.env.MONGO_URI?.trim();

// =====================================
// ADMIN CONFIGURATION
// =====================================

const adminName =
  process.env.ADMIN_NAME?.trim();

const adminEmail =
  process.env.ADMIN_EMAIL?.trim().toLowerCase();

const adminPassword =
  process.env.ADMIN_PASSWORD;

// =====================================
// CREATE ADMINISTRATOR
// =====================================

const createAdmin = async (): Promise<void> => {

  if (!mongoUri) {
    throw new Error("MongoDB connection URI is missing");
  }

  if (!adminName || adminName.length < 2) {
    throw new Error("Valid administrator name is required");
  }

  if (
    !adminEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)
  ) {
    throw new Error("Valid administrator email is required");
  }

  if (
    !adminPassword ||
    adminPassword.length < 16 ||
    Buffer.byteLength(adminPassword, "utf8") > 72
  ) {
    throw new Error(
      "Administrator password must contain at least 16 characters and not exceed 72 bytes"
    );
  }

  try {

    // Connect to MongoDB.

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected successfully");

    console.log(
      "Database:",
      mongoose.connection.name
    );

    // =================================
    // CHECK EXISTING ACCOUNT
    // =================================

    const existingUser = await User.findOne({
      email: adminEmail,
    });

    if (existingUser) {

      if (existingUser.role === "admin") {

        console.log(
          "Administrator account already exists"
        );

        return;

      }

      throw new Error(
        "Email belongs to an existing regular user. Use a separate administrator email."
      );

    }

    // =================================
    // HASH ADMIN PASSWORD
    // =================================

    const hashedPassword =
      await bcrypt.hash(adminPassword, 12);

    // =================================
    // CREATE ADMIN ACCOUNT
    // =================================

    const admin = await User.create({

      name: adminName,

      email: adminEmail,

      password: hashedPassword,

      role: "admin",

      status: "active",

      lastLoginAt: null,

      lastActiveAt: null,

      loginCount: 0,

      suspendedAt: null,

    });

    // =================================
    // SUCCESS RESPONSE
    // =================================

    console.log("----------------------------");

    console.log(
      "Administrator created successfully"
    );

    console.log("Name:", admin.name);

    console.log("Email:", admin.email);

    console.log("Role:", admin.role);

    console.log("Status:", admin.status);

    console.log("----------------------------");

  } finally {

    await mongoose.disconnect();

    console.log("MongoDB disconnected");

  }

};

// =====================================
// EXECUTE PROVISIONING
// =====================================

createAdmin().catch((error: unknown) => {

  if (error instanceof Error) {

    // Only expose predefined validation errors.

    const safeMessages = [
      "MongoDB connection URI is missing",
      "Valid administrator name is required",
      "Valid administrator email is required",
      "Administrator password must contain at least 16 characters and not exceed 72 bytes",
      "Email belongs to an existing regular user. Use a separate administrator email.",
    ];

    console.error(
      safeMessages.includes(error.message)
        ? error.message
        : "Administrator provisioning failed"
    );

  }

  process.exitCode = 1;

});