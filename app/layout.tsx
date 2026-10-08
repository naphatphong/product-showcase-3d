import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

// next/font โหลดฟอนต์ตอน build แล้วเสิร์ฟจากเว็บเราเอง (ไม่ดึงจาก Google ตอนเปิดเว็บ)
// และตั้งเป็น CSS variable ไว้ให้ globals.css เรียกใช้
// Cormorant Garamond = ตัวหนังสือหัวเรื่องแบบ serif หรูๆ, Jost = ตัวหนังสือทั่วไปแบบเรียบ
const display = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const sans = Jost({
  variable: "--font-jost",
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
    <html lang="en" className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
