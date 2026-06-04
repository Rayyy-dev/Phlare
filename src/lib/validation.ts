import { z } from "zod";

/**
 * Shared Zod schemas. Defined once and reused on both client and server so the
 * rules cannot drift (Section 6 / 8 — input validation as a first-class concern).
 */

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .max(200, "Password is too long.");

export const setupSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email."),
    orgName: z.string().trim().min(1, "Organisation name is required.").max(160),
    baseUrl: z.string().trim().url("Enter a valid URL (e.g. http://localhost:3000)."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export type SetupInput = z.infer<typeof setupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
