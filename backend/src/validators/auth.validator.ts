import { z } from "zod";

export const registerSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100),

  email: z.string()
    .trim()
    .email("Invalid email address")
    .toLowerCase(),

  password: z.string()
    .min(8, "Password must contain at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .refine(
      (password) => Buffer.byteLength(password, "utf8") <= 72,
      "Password must not exceed 72 bytes"
    ),
});

export const loginSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .toLowerCase(),

  password: z.string()
    .min(1, "Password is required")
    .refine(
      (password) => Buffer.byteLength(password, "utf8") <= 72,
      "Invalid password length"
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export type LoginInput = z.infer<typeof loginSchema>;