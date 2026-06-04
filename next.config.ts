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
        ],
      },
    ];
  },
};

export default nextConfig;
