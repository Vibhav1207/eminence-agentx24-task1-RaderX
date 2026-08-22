import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Task 1 of the Web — Autonomous Intelligence Platform",
  description: "Autonomous competitive and research intelligence platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#f8f9ff] text-[#0b1c30] antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
