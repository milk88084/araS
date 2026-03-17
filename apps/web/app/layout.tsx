import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkEnabled } from "../lib/clerk";
import "./globals.css";

export const metadata: Metadata = {
  title: "Production Template",
  description:
    "A production-ready Next.js + Express starter with Clerk auth, Prisma ORM, and comprehensive testing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  if (isClerkEnabled) {
    return (
      <html lang="en">
        <body>
          <ClerkProvider>{children}</ClerkProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
