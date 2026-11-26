import mongoose from "mongoose";

import {
  MongoMemoryServer,
} from "mongodb-memory-server";

// =====================================
// TEST DATABASE STATE
// =====================================

let mongoServer: MongoMemoryServer | null = null;

let testDatabaseUri: string | null = null;

// =====================================
// CONNECT TEST DATABASE
// =====================================

export const connectTestDatabase =
  async (): Promise<void> => {

    if (process.env.NODE_ENV !== "test") {
      throw new Error(
        "Test database requires NODE_ENV=test"
      );
    }

    if (mongoose.connection.readyState !== 0) {
      throw new Error(
        "An existing MongoDB connection was detected"
      );
    }

    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: "careerlens_test",
      },
    });

    testDatabaseUri = mongoServer.getUri();

    process.env.MONGODB_URI = testDatabaseUri;

    process.env.MONGO_URI = testDatabaseUri;

    try {

      await mongoose.connect(testDatabaseUri, {
        dbName: "careerlens_test",
      });

      console.log(
        "Isolated test database connected"
      );

    } catch (error) {

      await mongoServer.stop();

      mongoServer = null;

      testDatabaseUri = null;

      throw error;
    }
  };

// =====================================
// VERIFY DATABASE ISOLATION
// =====================================

const ensureTestDatabase = (): void => {

  if (
    process.env.NODE_ENV !== "test" ||
    !mongoServer ||
    !testDatabaseUri ||
    mongoose.connection.readyState !== 1 ||
    mongoose.connection.name !== "careerlens_test" ||
    mongoose.connection.host !==
      new URL(testDatabaseUri).hostname ||
    mongoose.connection.port !==
      Number(new URL(testDatabaseUri).port)
  ) {
    throw new Error(
      "Unsafe database operation prevented"
    );
  }
};

// =====================================
// CLEAR TEST DATABASE
// =====================================

export const clearTestDatabase =
  async (): Promise<void> => {

    ensureTestDatabase();

    const collections =
      mongoose.connection.collections;

    for (const collection of Object.values(
      collections
    )) {

      await collection.deleteMany({});
    }
  };

// =====================================
// DISCONNECT TEST DATABASE
// =====================================

export const disconnectTestDatabase =
  async (): Promise<void> => {

    if (!mongoServer) {
      return;
    }

    try {

      await mongoose.disconnect();

    } finally {

      await mongoServer.stop();

      mongoServer = null;

      testDatabaseUri = null;
    }

    console.log(
      "Isolated test database disconnected"
    );
  };