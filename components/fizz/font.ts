import { Archivo } from "next/font/google";

// ฟอนต์ของหน้า FIZZ: Archivo แบบ variable (หนาได้ถึง 900, เอียง, ขยายความกว้างได้ด้วยแกน wdth)
// ใช้ตัวหนาเอียงกว้างๆ เป็นหัวข้อแบบสปอร์ต — โหลดเฉพาะหน้านี้ หน้าอื่นไม่เสียเวลาโหลด
export const archivo = Archivo({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["wdth"],
  variable: "--font-archivo",
});
