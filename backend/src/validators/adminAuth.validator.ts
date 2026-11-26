import { z } from "zod";

// =====================================
// ADMIN LOGIN VALIDATION
// =====================================

export const adminLoginSchema = z.object({

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .max(254),

  password: z
    .string()
    .min(16)
    .refine(
      (password) =>
        Buffer.byteLength(password, "utf8") <= 72,
      {
        message: "Password must not exceed 72 bytes",
      }
    ),

}).strict();

// =====================================
// CHALLENGE TOKEN VALIDATION
// =====================================

const challengeTokenSchema = z
  .string()
  .regex(
    /^[a-f0-9]{64}$/,
    "Invalid authentication challenge"
  );

// =====================================
// OTP VALIDATION
// =====================================

const otpSchema = z
  .string()
  .regex(
    /^[0-9]{6}$/,
    "Authenticator code must contain six digits"
  );

// =====================================
// MFA SETUP VALIDATION
// =====================================

export const adminMfaSetupSchema = z.object({

  challengeToken: challengeTokenSchema,

}).strict();

// =====================================
// MFA ACTIVATION VALIDATION
// =====================================

export const adminMfaActivateSchema = z.object({

  challengeToken: challengeTokenSchema,

  otp: otpSchema,

}).strict();

// =====================================
// MFA LOGIN VALIDATION
// =====================================

export const adminMfaVerifySchema = z.object({

  challengeToken: challengeTokenSchema,

  otp: otpSchema,

}).strict();

// =====================================
// INPUT TYPES
// =====================================

export type AdminLoginInput =
  z.infer<typeof adminLoginSchema>;

export type AdminMfaSetupInput =
  z.infer<typeof adminMfaSetupSchema>;

export type AdminMfaActivateInput =
  z.infer<typeof adminMfaActivateSchema>;

export type AdminMfaVerifyInput =
  z.infer<typeof adminMfaVerifySchema>;