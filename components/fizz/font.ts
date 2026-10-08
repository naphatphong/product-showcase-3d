import { Archivo } from "next/font/google";

// ฟอนต์ของหน้า FIZZ: Archivo แบบ variable (หนาได้ถึง 900, เอียง, ขยายความกว้างได้ด้วยแกน wdth)
// ใช้ตัวหนาเอียงกว้างๆ เป็นหัวข้อแบบสปอร์ต — โหลดเฉพาะหน้านี้ หน้าอื่นไม่เสียเวลาโหลด
// preload: false = ไม่สั่งโหลดล่วงหน้า (หน้าแรกจะ prefetch หน้านี้ไว้ ถ้า preload ด้วยเบราว์เซอร์จะเตือนว่าโหลดแล้วไม่ได้ใช้)
// หน้านี้มีหน้าโหลดบังอยู่ช่วงแรกอยู่แล้ว ฟอนต์จึงมาทันก่อนผู้ใช้เห็นข้อความ
export const archivo = Archivo({
  preload: false,
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["wdth"],
  variable: "--font-archivo",
});
