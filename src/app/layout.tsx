import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RADARX — Autonomous Intelligence Platform",
  description: "Autonomous multi-agent intelligence platform for organizations, startups, and research teams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full bg-[#F7F6F2] text-[#111827] bg-ambient-gold antialiased font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
