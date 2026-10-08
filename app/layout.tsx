import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

// next/font โหลดฟอนต์ตอน build แล้วเสิร์ฟจากเว็บเราเอง (ไม่ดึงจาก Google ตอนเปิดเว็บ)
// และตั้งเป็น CSS variable ไว้ให้ globals.css เรียกใช้
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// title / description ของแท็บและตอนแชร์ลิงก์ ดึงจาก config ของเว็บ
export const metadata: Metadata = {
  title: `${site.name} ${site.byline}`,
  description: `${site.headline} Interactive 3D product showcase — concept projects.`,
};

// layout ครอบทุกหน้า: ใส่ <html> <body> และคลาสฟอนต์ไว้ที่นี่ที่เดียว
// LayoutProps เป็น type ที่ Next.js สร้างให้อัตโนมัติตอน build/dev
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
