import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phlare — Phishing Simulation & Awareness Training",
  description:
    "Self-hosted phishing-simulation and security-awareness training platform for SMEs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
