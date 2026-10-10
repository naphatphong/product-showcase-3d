import type { Metadata } from "next";
import Showroom from "@/components/f1/showroom/Showroom";
import { products } from "@/config/products";

const f1 = products.find((p) => p.slug === "f1")!;

export const metadata: Metadata = {
  title: `Garage — ${f1.name}`,
  description: `${f1.name}: three 2026 Formula 1 cars in a 3D garage. Turn each car around, take it apart and click any part to see what it does.`,
};

// หน้าโชว์รูม 3D ของ GRID 26 (/f1/showroom): อู่รถแข่งที่มีรถ 3 ทีม (ดู components/f1/showroom)
export default function Page() {
  return <Showroom />;
}
