import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mockup.css";
import { asset } from "./base";

export const metadata: Metadata = {
  title: "นครทริป · เที่ยววัดในมุมใหม่",
  description: "สำรวจพระปฐมเจดีย์และพระประโทณเจดีย์แบบสามมิติ พร้อมเรื่องราว บทสวด และคู่มือเดินชมที่อ่านง่ายสำหรับทุกวัย",
  icons: {
    icon: asset("/favicon.svg"),
    shortcut: asset("/favicon.svg"),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ea" },
    { media: "(prefers-color-scheme: dark)", color: "#101815" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai+Looped:wght@400;500;600;700&family=Noto+Serif+Thai:wght@500;600;700&display=swap" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
