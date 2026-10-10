import type { Metadata } from "next";
import HouseLanding from "@/components/house/HouseLanding";

// หน้าสินค้า /house — HEARTH: หน้าแรกของเว็บห้องนั่งเล่น + ครัว แบบ fluid.glass (ดู components/house)
// ชื่อหน้าตั้งตรงนี้: ชิ้นที่ 4 บนวงแหวนหน้าแรก (config/products.ts) จะเปลี่ยนเป็น HEARTH ใน Step 64
export const metadata: Metadata = {
  title: "HEARTH — Living room & kitchen",
  description: "HEARTH: a living room built around the fire. A 3D room you tour by scrolling.",
};

export default function Page() {
  return <HouseLanding />;
}
