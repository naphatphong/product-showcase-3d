import ProductIntro, { productMetadata } from "@/components/ProductIntro";

// หน้าสินค้า /phone — ตอนนี้เป็นหน้าชั่วคราว ข้อมูลทั้งหมดมาจาก config/products.ts
export const metadata = productMetadata("phone");

export default function Page() {
  return <ProductIntro slug="phone" />;
}
