import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app runs behind its own domain in a self-hosted deployment. `standalone`
  // output produces a minimal server bundle for the Docker image.
  output: "standalone",
  // This project lives inside a parent folder that also has a lockfile; pin the
  // tracing root to this app so standalone output bundles the right files.
  outputFileTracingRoot: __dirname,
  // argon2 and nodemailer are native/Node-only — keep them external to the
  // server bundle so they are required at runtime rather than bundled.
  serverExternalPackages: ["argon2", "@prisma/client", "bullmq", "nodemailer", "playwright"],
  // Security headers applied to every response (defence-in-depth, see docs/security.md).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // HSTS is honoured only over HTTPS; harmless in dev. Defence-in-depth.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // CSP as defence-in-depth (the primary XSS control is server-side
          // sanitisation of user-authored HTML). 'unsafe-inline' is required by
          // Next.js hydration without a nonce pipeline; 'unsafe-eval' is added in
          // DEVELOPMENT ONLY (Next dev fast-refresh uses eval) — production stays
          // stricter. Documented in security.md.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data:",
              "style-src 'self' 'unsafe-inline'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
