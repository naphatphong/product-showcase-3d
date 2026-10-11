import { productMetadata } from "@/components/ProductIntro";
import Fizz from "@/components/fizz/Fizz";

// หน้าสินค้า /drink — FIZZ: เลือกกระป๋อง 6 ยี่ห้อ แล้วเลื่อนดูเรื่องราวทีละ section (ดู components/fizz)
export const metadata = productMetadata("drink");

export default function Page() {
  return <Fizz />;
}
