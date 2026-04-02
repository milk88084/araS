import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "財務管家",
  description: "個人財務管理工具",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
