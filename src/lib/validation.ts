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

// ── Enums (kept in sync with the Prisma schema) ──────────────────────────────
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export const PSYCH_PRINCIPLES = [
  "AUTHORITY",
  "URGENCY",
  "SOCIAL_PROOF",
  "RECIPROCITY",
  "LIKING",
  "CURIOSITY_FEAR",
] as const;
export const SMTP_SECURITIES = ["NONE", "STARTTLS", "SSL"] as const;
export const LANDING_FIELD_TYPES = ["text", "email", "password", "tel"] as const;

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

// ── Email templates ──────────────────────────────────────────────────────────

export const emailTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(160),
  subject: z.string().trim().min(1, "Subject is required.").max(200),
  senderName: z.string().trim().min(1, "Sender name is required.").max(120),
  senderEmail: z.string().trim().toLowerCase().email("Enter a valid sender email."),
  htmlBody: z.string().min(1, "The email body cannot be empty."),
  textBody: optionalText(20000),
  difficulty: z.enum(DIFFICULTIES),
  principle: z.enum(PSYCH_PRINCIPLES),
  // Warning signs present in this template; shown on the teachable-moment page.
  redFlags: z.array(z.string().trim().min(1)).max(20).default([]),
});

// ── Landing pages ────────────────────────────────────────────────────────────

export const landingFieldSchema = z.object({
  // The form field NAME — used only to record which fields were filled, never
  // their values. Restricted to a safe identifier.
  name: z.string().trim().min(1).max(60).regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, - or _ only."),
  label: z.string().trim().min(1).max(120),
  type: z.enum(LANDING_FIELD_TYPES),
});

export const landingPageSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(160),
  htmlBody: z.string().min(1, "The page body cannot be empty."),
  hasForm: z.boolean().default(false),
  fieldDefs: z.array(landingFieldSchema).max(20).default([]),
  difficulty: z.enum(DIFFICULTIES),
});

// ── Sending profiles ─────────────────────────────────────────────────────────

const baseSendingProfile = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  host: z.string().trim().min(1, "Host is required.").max(255),
  port: z.coerce.number().int().min(1).max(65535),
  username: optionalText(255),
  security: z.enum(SMTP_SECURITIES),
  fromName: z.string().trim().min(1, "From name is required.").max(120),
  fromEmail: z.string().trim().toLowerCase().email("Enter a valid from email."),
});

// On create a password may be supplied; on edit it is only set when changed, so
// the password is always optional and handled separately from the core fields.
export const sendingProfileSchema = baseSendingProfile.extend({
  password: optionalText(255),
});

export const testEmailSchema = z.object({
  to: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

// ── Campaigns ────────────────────────────────────────────────────────────────

export const campaignSchema = z.object({
  name: z.string().trim().min(1, "Campaign name is required.").max(160),
  emailTemplateId: z.string().min(1, "Select an email template."),
  landingPageId: z.string().min(1, "Select a landing page."),
  sendingProfileId: z.string().min(1, "Select a sending profile."),
  quizId: optionalText(60),
  groupIds: z.array(z.string().min(1)).min(1, "Select at least one recipient group."),
  // datetime-local string; blank means "send on launch".
  scheduledAt: optionalText(40),
  throttlePerMinute: z.coerce.number().int().min(1, "At least 1 per minute.").max(10000),
});

export type CampaignInput = z.infer<typeof campaignSchema>;

// ── Quizzes ──────────────────────────────────────────────────────────────────

export const quizQuestionSchema = z
  .object({
    q: z.string().trim().min(1, "Question text is required.").max(500),
    options: z.array(z.string().trim().min(1).max(300)).min(2, "At least two options.").max(4),
    correctIndex: z.coerce.number().int().min(0),
    explanation: optionalText(1000),
  })
  .refine((d) => d.correctIndex < d.options.length, {
    message: "The correct answer must be one of the options.",
    path: ["correctIndex"],
  });

export const quizSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(160),
  templateId: optionalText(60),
  questions: z.array(quizQuestionSchema).min(1, "Add at least one question.").max(10),
});

export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;
export type QuizInput = z.infer<typeof quizSchema>;

export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;
export type LandingFieldDef = z.infer<typeof landingFieldSchema>;
export type LandingPageInput = z.infer<typeof landingPageSchema>;
export type SendingProfileInput = z.infer<typeof sendingProfileSchema>;
