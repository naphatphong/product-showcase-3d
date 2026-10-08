import ProductIntro, { productMetadata } from "@/components/ProductIntro";

// หน้าสินค้า /f1 — ตอนนี้เป็นหน้าชั่วคราว ข้อมูลทั้งหมดมาจาก config/products.ts
export const metadata = productMetadata("f1");

export default function Page() {
  return <ProductIntro slug="f1" />;
}
