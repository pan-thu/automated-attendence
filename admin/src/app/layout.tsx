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
  title: "Automated Attendance Admin",
  description: "Admin dashboard for attendance management",
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
