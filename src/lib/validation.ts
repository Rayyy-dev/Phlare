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

// An optional free-text field: blank/whitespace becomes `undefined` rather than
// an empty string, so optional columns import cleanly.
const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional()
  );

export const recipientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  department: optionalText(120),
  position: optionalText(120),
});

export const groupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required.").max(120),
  description: optionalText(500),
});

// The recipient fields a CSV column can be mapped to, in display order.
export const RECIPIENT_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "department",
  "position",
] as const;

export type RecipientField = (typeof RECIPIENT_FIELDS)[number];
export type RecipientInput = z.infer<typeof recipientSchema>;
export type GroupInput = z.infer<typeof groupSchema>;
