import ProductIntro, { productMetadata } from "@/components/ProductIntro";

// หน้าสินค้า /house — ตอนนี้เป็นหน้าชั่วคราว (หน้าเว็บบ้านแบบ fluid.glass + ชมบ้านอิสระ จะทำในขั้นต่อไป)
export const metadata = productMetadata("house");

export default function Page() {
  return <ProductIntro slug="house" />;
}
