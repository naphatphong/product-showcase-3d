// HEARTH: ห้องนั่งเล่น + ครัว (โมเดล VH) ในส่วน "ทัวร์" ของหน้า /house
// ไฟล์โมเดลและแสงที่อบไว้ทำจาก scripts/hearth (ดู README.md ในนั้น) อยู่ใน public/models/house/
// ตำแหน่งทุกตัวเลขในไฟล์นี้เป็นพิกัดของ three.js (เมตร, แกน y ชี้ขึ้น) ของโมเดลห้องโดยตรง

export type Vec3 = [number, number, number];
export type Pose = { pos: Vec3; at: Vec3; fov: number }; // กล้องอยู่ที่ pos มองไปที่ at, fov = มุมกว้างแนวตั้ง (องศา)
export type Zone = "sofa" | "fire" | "dining" | "kitchen"; // มุมของห้อง (ตรงกับ zone ที่ prep.py แปะไว้ในเฟอร์นิเจอร์แต่ละชิ้น)

export type Stop = {
  id: string;
  title: string;
  text: string;
  zone?: Zone; // เฟอร์นิเจอร์มุมนี้เด้งขึ้นตอนกล้องมาถึง
  arrive: Pose; // ท่ากล้องตอนมาถึงจุดนี้
  settle: Pose; // ท่ากล้องตอนจบจุดนี้ (ค่อยๆ เคลื่อนเข้าไปช้าๆ จาก arrive)
};

export const HEARTH = {
  name: "HEARTH",
  model: "/models/house/hearth.glb", // 12.8 MB
  modelLite: "/models/house/hearth-lite.glb", // 7.8 MB สำหรับมือถือ (สามเหลี่ยมน้อยกว่า รูปพื้นผิวเล็กกว่า)
  lightmaps: {
    dayEmpty: "/models/house/hearth-lm-day-empty.webp", // แสงบนผนัง/พื้น/ฝ้า ตอนห้องว่าง
    dayFull: "/models/house/hearth-lm-day-full.webp", // ตอนเฟอร์นิเจอร์ครบ (มีเงาใต้เฟอร์นิเจอร์)
    night: "/models/house/hearth-lm-night.webp", // ยามค่ำ
  },
  panoDay: "/models/house/hearth-pano-day.hdr", // ภาพ 360° กลางห้อง ใช้ทำเงาสะท้อน
  panoNight: "/models/house/hearth-pano-night.hdr",
  // ตัวเลขตอนแปลงแสงเป็นรูป (scripts/hearth/README.md ขั้น 3 และ export.py) ต้องตรงกัน ไม่งั้นแสงเพี้ยน
  lightmapScale: { day: 6, night: 5 },
  vertexScale: 4,
  exposure: { day: 0.7, night: 0.22 }, // ความสว่างของภาพ (ค่าที่เทียบกับภาพเรนเดอร์ Cycles แล้ว)
  lampGlow: 12, // ความสว่างหลอดไฟ/แถบ LED ตอนกลางคืน
  background: { day: "#e9e3d9", night: "#17150f" },
} as const;

// 7 จุดของทัวร์ (เลื่อนลงทีละจุด)
export const STOPS: Stop[] = [
  {
    id: "empty",
    title: "An empty room",
    text: "Oak floor, slatted walls and light from two windows. Keep scrolling and the room furnishes itself.",
    arrive: { pos: [23.9, 2.4, -17.3], at: [21.0, 0.4, -11.5], fov: 66 },
    settle: { pos: [23.55, 2.2, -16.75], at: [21.0, 0.45, -11.6], fov: 62 },
  },
  {
    id: "sofa",
    title: "The sofa",
    text: "A long modular sofa, a sculpted armchair and a low white table on a soft rug.",
    zone: "sofa",
    arrive: { pos: [20.3, 1.3, -13.6], at: [23.2, 0.5, -11.8], fov: 58 },
    settle: { pos: [20.75, 1.15, -13.25], at: [23.2, 0.5, -11.8], fov: 54 },
  },
  {
    id: "fire",
    title: "The fire wall",
    text: "A long low fire under the screen, slatted panels on both sides and a small tree for December.",
    zone: "fire",
    arrive: { pos: [23.4, 1.35, -12.6], at: [20.0, 1.0, -12.0], fov: 55 },
    settle: { pos: [22.75, 1.25, -12.45], at: [20.0, 1.0, -12.0], fov: 52 },
  },
  {
    id: "dining",
    title: "Dining",
    text: "A long white table on brass legs, under a cloud of feathers.",
    zone: "dining",
    arrive: { pos: [22.0, 1.5, -13.0], at: [24.4, 0.9, -15.3], fov: 55 },
    settle: { pos: [22.5, 1.38, -13.5], at: [24.4, 0.9, -15.3], fov: 52 },
  },
  {
    id: "kitchen",
    title: "Kitchen",
    text: "Gold-veined marble on the island and behind the sink, with a zigzag of light above.",
    zone: "kitchen",
    arrive: { pos: [21.2, 1.5, -15.2], at: [23.0, 1.1, -19.5], fov: 60 },
    settle: { pos: [21.5, 1.42, -15.85], at: [23.0, 1.1, -19.5], fov: 56 },
  },
  {
    id: "evening",
    title: "Evening light",
    text: "The sun goes down. Hidden ceiling lights, the fire and the lamps take over.",
    arrive: { pos: [23.8, 1.55, -17.0], at: [20.8, 0.9, -11.5], fov: 62 },
    settle: { pos: [23.45, 1.45, -16.4], at: [20.8, 0.9, -11.5], fov: 58 },
  },
  {
    id: "hearth",
    title: "HEARTH",
    text: "One room, every piece in its place.",
    arrive: { pos: [23.55, 1.7, -16.6], at: [21.0, 0.6, -11.6], fov: 62 },
    settle: { pos: [23.9, 2.45, -17.3], at: [21.0, 0.4, -11.5], fov: 70 },
  },
];

export const EVENING = STOPS.findIndex((s) => s.id === "evening");
