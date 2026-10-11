import { Archivo, IBM_Plex_Mono } from "next/font/google";

// ฟอนต์ที่ใช้ร่วมกันหลายหน้า (หน้าแรก + หน้า FIZZ) — ไฟล์ฟอนต์ชุดเดียวกัน เปิดหน้าหนึ่งแล้วอีกหน้าไม่ต้องโหลดซ้ำ
// preload: false = ไม่สั่งโหลดล่วงหน้า (หน้าแรก prefetch หน้าสินค้าไว้ ถ้า preload ด้วยเบราว์เซอร์จะเตือนว่าโหลดแล้วไม่ได้ใช้)
// ทั้ง 2 หน้ามีหน้าโหลดบังอยู่ช่วงแรกอยู่แล้ว ฟอนต์จึงมาทันก่อนผู้ใช้เห็นข้อความ

// Archivo แบบ variable: บางสุด 100 ถึงหนาสุด 900, เอียงได้, ขยายความกว้างได้ด้วยแกน wdth
// หน้าแรกใช้ตัวบาง (หัวข้อหน้าเปิด) และตัวหนา (ชื่อสินค้า) / หน้า FIZZ ใช้ตัวหนาเอียงกว้างๆ แบบสปอร์ต
export const archivo = Archivo({
  preload: false,
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["wdth"],
  variable: "--font-archivo",
});

// ตัวพิมพ์ดีด (monospace) สำหรับป้ายเล็กๆ แบบหน้าจอเครื่องมือ (HUD) ในหน้าแรก
export const plexMono = IBM_Plex_Mono({
  preload: false,
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});
