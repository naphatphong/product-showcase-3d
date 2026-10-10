import { productMetadata } from "@/components/ProductIntro";
import F1Story from "@/components/f1/F1Story";

// หน้าสินค้า /f1 — GRID 26: เลื่อนลงทีละสไลด์ รถ RB22 แยกชิ้นทีละส่วน แล้วประกอบกลับ (ดู components/f1)
export const metadata = productMetadata("f1");

export default function Page() {
  return <F1Story />;
}
