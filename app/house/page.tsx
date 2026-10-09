import { productMetadata } from "@/components/ProductIntro";
import HouseLanding from "@/components/house/HouseLanding";

// หน้าสินค้า /house — MONOLITH: หน้าแรกของเว็บบ้านแบบ fluid.glass (ดู components/house)
// ส่วนเดินชมบ้านอิสระจะเป็นหน้าแยก ทำในขั้นต่อไป
export const metadata = productMetadata("house");

export default function Page() {
  return <HouseLanding />;
}
