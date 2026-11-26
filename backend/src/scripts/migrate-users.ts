import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/user.model.js";

dotenv.config();

// =====================================
// MIGRATION CONFIGURATION
// =====================================

const mongoUri =
  process.env.MONGODB_URI?.trim() ||
  process.env.MONGO_URI?.trim();

const applyMigration =
  process.argv.includes("--apply");

// =====================================
// USER DATABASE MIGRATION
// =====================================

const migrateUsers = async (): Promise<void> => {

  if (!mongoUri) {

    throw new Error(
      "MongoDB connection URI is missing"
    );

  }

  try {

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected successfully");

    console.log(
      "Database:", mongoose.connection.name
    );

    console.log(
      "Migration mode:",
      applyMigration ? "APPLY" : "DRY RUN"
    );

    // =================================
    // COUNT EXISTING USERS
    // =================================

    const totalUsers =
      await User.countDocuments();

    console.log(
      "Total existing users:", totalUsers
    );

    // =================================
    // MIGRATION FIELDS
    // =================================

    const fields = [

      {
        name: "role",
        value: "user",
      },

      {
        name: "status",
        value: "active",
      },

      {
        name: "lastLoginAt",
        value: null,
      },

      {
        name: "lastActiveAt",
        value: null,
      },

      {
        name: "loginCount",
        value: 0,
      },

      {
        name: "suspendedAt",
        value: null,
      },

    ] as const;

    // =================================
    // UPDATE MISSING FIELDS ONLY
    // =================================

    for (const field of fields) {

      const filter = {

        [field.name]: {
          $exists: false,
        },

      };

      const missingCount =
        await User.collection.countDocuments(
          filter
        );

      console.log(
        `${field.name}: ${missingCount} records missing this field`
      );

      if (
        applyMigration &&
        missingCount > 0
      ) {

        const result =
          await User.collection.updateMany(

            filter,

            {
              $set: {

                [field.name]: field.value,

              },
            }

          );

        console.log(
          `Updated ${field.name}: ${result.modifiedCount} records`
        );

      }

    }

    // =================================
    // MIGRATION SUMMARY
    // =================================

    console.log("----------------------------");

    if (applyMigration) {

      console.log(
        "User migration completed successfully"
      );

    } else {

      console.log(
        "Dry run completed. No user records were modified."
      );

    }

    console.log("----------------------------");

  } finally {

    await mongoose.disconnect();

    console.log("MongoDB disconnected");

  }

};

// =====================================
// EXECUTE MIGRATION
// =====================================

migrateUsers().catch(() => {

  console.error(
    "User migration failed"
  );

  process.exitCode = 1;

});