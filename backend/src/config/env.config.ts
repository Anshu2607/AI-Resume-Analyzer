import dotenv from "dotenv";
import { z } from "zod";
import { isIP } from "node:net";

import {
  validateProductionSecurity,
} from "./productionSecurity.config.js";

dotenv.config();

// =====================================
// ENVIRONMENT VALIDATION SCHEMA
// =====================================

const environmentSchema = z.object({

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  DEPLOYMENT_MODE: z
    .enum(["standard", "local-docker", "cloud"])
    .default("standard"),

  TRUSTED_PROXY: z.string().optional(),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(5000),

  MONGODB_URI: z.string().optional(),

  MONGO_URI: z.string().optional(),

  JWT_SECRET: z.string().min(32),

  JWT_EXPIRES_IN: z.string().optional(),

  CLIENT_URL: z.string().optional(),

  GROQ_API_KEY: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),

  LLM_PROVIDER: z
    .enum(["groq", "gemini"])
    .default("groq"),

  LLM_FALLBACK_PROVIDER: z
    .enum(["groq", "gemini"])
    .default("gemini"),

  LLM_FALLBACK_ENABLED: z
    .enum(["true", "false"])
    .default("false"),

  REDIS_HOST: z.string()
    .min(1)
    .default("127.0.0.1"),

  REDIS_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(6379),

  REDIS_PASSWORD: z.string().optional(),

  REDIS_DB: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(0),

  QUEUE_WORKER_CONCURRENCY: z.coerce
    .number()
    .int()
    .positive()
    .default(2),

  // ===================================
  // ADMINISTRATOR SECURITY
  // ===================================

  ADMIN_MFA_ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/),

  ADMIN_MFA_ENROLLMENT_ENABLED: z
    .enum(["true", "false"])
    .default("false"),

  // ===================================
  // AI SECURITY AND ANALYTICS
  // ===================================

  AI_QUOTA_ENABLED: z
    .enum(["true", "false"])
    .default("true"),

  AI_USAGE_TRACKING_ENABLED: z
    .enum(["true", "false"])
    .default("true"),

  ACTIVITY_TRACKING_ENABLED: z
    .enum(["true", "false"])
    .default("true"),

  AI_MODEL_PRICING_JSON: z
    .string()
    .optional(),

});

// =====================================
// VALIDATE ENVIRONMENT
// =====================================

export const validateEnvironment = (): void => {

  const result =
    environmentSchema.safeParse(process.env);

  if (!result.success) {

    console.error(
      "Environment configuration validation failed:"
    );

    for (const issue of result.error.issues) {

      console.error(
        `- ${issue.path.join(".")}: invalid or missing configuration`
      );

    }

    throw new Error(
      "Invalid environment configuration"
    );
  }

  const env = result.data;

  const errors: string[] = [];

  const isProduction =
    env.NODE_ENV === "production";

  const isLocalDocker =
    env.DEPLOYMENT_MODE === "local-docker";

  const isCloud =
    env.DEPLOYMENT_MODE === "cloud";

  // ===================================
  // DEPLOYMENT MODE VALIDATION
  // ===================================

  if (
    (isLocalDocker || isCloud) &&
    !isProduction
  ) {

    errors.push(
      "Docker and cloud deployment modes require NODE_ENV=production"
    );

  }

  // ===================================
  // DATABASE CONFIGURATION
  // ===================================

  const mongoUri =
    env.MONGODB_URI?.trim() ||
    env.MONGO_URI?.trim();

  if (!mongoUri) {

    errors.push(
      "MongoDB connection URI is required"
    );

  } else if (

    !mongoUri.startsWith("mongodb://") &&
    !mongoUri.startsWith("mongodb+srv://")

  ) {

    errors.push(
      "Invalid MongoDB connection URI"
    );

  }

  // ===================================
  // AI PROVIDER CONFIGURATION
  // ===================================

  if (

    env.LLM_PROVIDER === "groq" &&
    !env.GROQ_API_KEY?.trim()

  ) {

    errors.push(
      "GROQ_API_KEY is required for the selected primary provider"
    );

  }

  if (

    env.LLM_PROVIDER === "gemini" &&
    !env.GEMINI_API_KEY?.trim()

  ) {

    errors.push(
      "GEMINI_API_KEY is required for the selected primary provider"
    );

  }

  // ===================================
  // FALLBACK PROVIDER CONFIGURATION
  // ===================================

  if (env.LLM_FALLBACK_ENABLED === "true") {

    if (
      env.LLM_PROVIDER ===
      env.LLM_FALLBACK_PROVIDER
    ) {

      errors.push(
        "Primary and fallback providers must be different"
      );

    }

    if (

      env.LLM_FALLBACK_PROVIDER === "groq" &&
      !env.GROQ_API_KEY?.trim()

    ) {

      errors.push(
        "GROQ_API_KEY is required for fallback"
      );

    }

    if (

      env.LLM_FALLBACK_PROVIDER === "gemini" &&
      !env.GEMINI_API_KEY?.trim()

    ) {

      errors.push(
        "GEMINI_API_KEY is required for fallback"
      );

    }

  }

  // ===================================
  // TRUSTED PROXY VALIDATION
  // ===================================

  const trustedProxy =
    env.TRUSTED_PROXY?.trim();

  if (
    trustedProxy &&
    isIP(trustedProxy) === 0
  ) {

    errors.push(
      "TRUSTED_PROXY must be an explicit IPv4 or IPv6 address"
    );

  }

  if (isLocalDocker && !trustedProxy) {

    errors.push(
      "TRUSTED_PROXY is required in local Docker mode"
    );

  }

  // ===================================
  // JWT EXPIRATION VALIDATION
  // ===================================

  if (

    env.JWT_EXPIRES_IN !== undefined &&

    !/^[1-9]\d*(s|m|h|d)$/.test(
      env.JWT_EXPIRES_IN
    )

  ) {

    errors.push(
      "JWT_EXPIRES_IN must use a valid duration such as 1h or 1d"
    );

  }

  // ===================================
  // AI MODEL PRICING VALIDATION
  // ===================================

  if (env.AI_MODEL_PRICING_JSON?.trim()) {

    try {

      const pricing: unknown = JSON.parse(
        env.AI_MODEL_PRICING_JSON
      );

      if (

        typeof pricing !== "object" ||

        pricing === null ||

        Array.isArray(pricing)

      ) {

        throw new Error(
          "Invalid pricing object"
        );

      }

      for (
        const [key, value] of Object.entries(pricing)
      ) {

        if (
          !/^(groq|gemini):.+$/.test(key) ||

          typeof value !== "object" ||

          value === null ||

          Array.isArray(value)
        ) {

          throw new Error(
            "Invalid pricing configuration"
          );

        }

        const rates = value as Record<
          string,
          unknown
        >;

        for (
          const field of [
            "inputPerMillion",
            "outputPerMillion",
          ]
        ) {

          const rate = rates[field];

          if (

            typeof rate !== "number" ||

            !Number.isFinite(rate) ||

            rate < 0

          ) {

            throw new Error(
              "Invalid model pricing rate"
            );

          }

        }

      }

    } catch {

      errors.push(
        "AI_MODEL_PRICING_JSON contains invalid model pricing configuration"
      );

    }
  }

  // ===================================
  // PRODUCTION SECURITY VALIDATION
  // ===================================

  if (isProduction) {

    if (

      env.JWT_SECRET.trim().length < 64 ||

      /change.?me|placeholder|example|testing-secret/i
        .test(env.JWT_SECRET)

    ) {

      errors.push(
        "Production requires a strong JWT_SECRET of at least 64 characters"
      );

    }

    if (!env.REDIS_PASSWORD?.trim()) {

      errors.push(
        "Redis authentication is required in production"
      );

    }

    if (
      env.ADMIN_MFA_ENROLLMENT_ENABLED === "true"
    ) {

      errors.push(
        "Administrator MFA enrollment must be disabled in production"
      );

    }

    if (env.AI_QUOTA_ENABLED !== "true") {

      errors.push(
        "AI usage quotas must remain enabled in production"
      );

    }

    if (env.AI_USAGE_TRACKING_ENABLED !== "true") {

      errors.push(
        "AI usage tracking must remain enabled in production"
      );

    }

    // =================================
    // FRONTEND ORIGIN VALIDATION
    // =================================

    const origins = (env.CLIENT_URL || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (origins.length === 0) {

      errors.push(
        "At least one frontend origin is required"
      );

    }

    for (const origin of origins) {

      try {

        const parsed = new URL(origin);

        if (

          parsed.origin !== origin ||

          !["http:", "https:"]
            .includes(parsed.protocol)

        ) {

          errors.push(
            "Invalid frontend origin"
          );

          continue;
        }

        // Local Docker development.

        if (isLocalDocker) {

          const allowedLocalOrigins = [

            "http://localhost:3000",

            "http://127.0.0.1:3000",

          ];

          if (
            !allowedLocalOrigins.includes(origin)
          ) {

            errors.push(
              "Invalid local Docker frontend origin"
            );

          }

          continue;

        }

        // Public production deployment.

        if (parsed.protocol !== "https:") {

          errors.push(
            "Production CLIENT_URL origins must use HTTPS"
          );

        }

        if (

          ["localhost", "127.0.0.1", "[::1]"]
            .includes(parsed.hostname)

        ) {

          errors.push(
            "Localhost origins are not allowed in production"
          );

        }

      } catch {

        errors.push(
          "Invalid frontend origin configuration"
        );

      }

    }

  }

  // ===================================
  // VALIDATION RESULT
  // ===================================

  if (errors.length > 0) {

    console.error(
      "Environment configuration errors:"
    );

    for (const error of errors) {

      console.error(`- ${error}`);

    }

    throw new Error(
      "Environment security validation failed"
    );
  }

  // Run additional security validator.
  // Never print secret values.

  try {

    validateProductionSecurity();

  } catch (error) {

    console.error(
      error instanceof Error
        ? error.message
        : "Security configuration validation failed"
    );

    throw error;

  }

  console.log(
    "Environment configuration validated successfully"
  );

  console.log(
    `Deployment mode: ${env.DEPLOYMENT_MODE}`
  );

};