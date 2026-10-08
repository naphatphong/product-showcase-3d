"use client";

import dynamic from "next/dynamic";

// โหลด Scene แบบ dynamic import และ ssr: false
// - WebGL มีแค่ในเบราว์เซอร์ ถ้าให้ server render จะ error
// - three.js ไฟล์ใหญ่ แยก bundle ออกมา ทำให้ข้อความหน้าแรกขึ้นก่อน แล้ว 3D ค่อยตามมา
// Next.js อนุญาต ssr: false เฉพาะใน Client Component จึงต้องมีไฟล์ห่อเล็กๆ นี้
// (page.tsx เป็น Server Component เรียก dynamic(..., { ssr: false }) ตรงๆ ไม่ได้)
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default Scene;
