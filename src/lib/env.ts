/**
 * Centralised, validated access to environment configuration.
 *
 * We validate lazily (on first access) rather than at import time so that
 * tooling such as `next build` and `prisma generate`, which may run without a
 * full runtime environment, do not crash. Each getter throws a clear error if a
 * required variable is missing when it is actually needed.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`
    );
  }
  return value;
}

export const env = {
  get appBaseUrl(): string {
    return process.env.APP_BASE_URL ?? "http://localhost:3000";
  },
  get databaseUrl(): string {
    return required("DATABASE_URL");
  },
  get redisUrl(): string {
    return process.env.REDIS_URL ?? "redis://localhost:6379";
  },
  get sessionSecret(): string {
    return required("SESSION_SECRET");
  },
  /** AES-256-GCM key as 64 hex chars (32 bytes). */
  get encryptionKey(): string {
    return required("APP_ENCRYPTION_KEY");
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};
