import type { ReactNode } from "react";
import "./globals.css";

import { Inter } from "next/font/google";

import { AuthProvider } from "@/providers/auth-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "AttenDesk Admin",
  description: "Admin dashboard for attendance management",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    other: [
      { url: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
