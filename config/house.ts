// ข้อมูลหน้าเว็บบ้าน /house (หน้าแรกแบบ fluid.glass)
// กติกาสำคัญ: รูปและวิดีโอทุกชิ้นในหน้านี้อัดจากโมเดล 3D ตัวจริงของบ้านหลังนั้น (ไม่ใช้รูปจากที่อื่น)
// บ้านแต่ละหลังใช้รูปของหลังนั้นเองเท่านั้น → ถ้าเปลี่ยนโมเดล ต้องอัดรูปใหม่ด้วย
// ไฟล์รูปอยู่ใน public/photos/house/ (WebP 1600×900) / วิดีโออยู่ใน public/video/house/

export type HomeShot = {
  src: string;
  alt: string; // บอกว่าในรูปมีอะไร (สำหรับ screen reader และตอนรูปโหลดไม่ขึ้น)
  caption: string; // ป้ายเล็กใต้รูป
};

export type Home = {
  id: string; // ใช้เป็น anchor ในหน้า เช่น #home-pavilion
  name: string;
  type: string; // ประเภทบ้าน
  source: string; // ไฟล์โมเดลต้นฉบับที่ Blue โหลดมา (ไว้ตามหาเครดิต)
  summary: string;
  specs: { label: string; value: string }[]; // ตัวเลขวัดจากโมเดลจริง
  cover: HomeShot; // รูปหลักของบ้าน (ใช้ในกลุ่มรูปลอย + แถวรายการบ้าน)
  shots: HomeShot[]; // รูปเพิ่มเติมในแถวรายการบ้าน
};

const shot = (file: string, alt: string, caption: string): HomeShot => ({
  src: `/photos/house/${file}.webp`,
  alt,
  caption,
});

export const HOMES: Home[] = [
  {
    id: "monolith",
    name: "Monolith",
    type: "Modern villa",
    source: "Export.fbx (fbx.rar)",
    summary:
      "A courtyard villa of pale concrete and rough stone, with a brick lattice tower, a long pool and a garden of hawthorn and cherry trees.",
    specs: [
      { label: "Plot", value: "39 × 35 m" },
      { label: "Height", value: "9 m" },
      { label: "Built in", value: "Concrete, stone" },
      { label: "Outside", value: "Pool, garden" },
    ],
    cover: shot("monolith-1", "Concrete villa with a stone wall, a brick lattice tower and a pool in front", "Front garden"),
    shots: [
      shot("monolith-2", "The pool terrace and sun loungers seen from above the garden wall", "Pool terrace"),
      shot("monolith-3", "Grey sofas under a concrete overhang next to a rough stone wall", "Under the overhang"),
      shot("monolith-4", "Looking down on the brick lattice, the stone wall and the ivy", "From above"),
    ],
  },
  {
    id: "pavilion",
    name: "Pavilion H12",
    type: "Timber pavilion",
    source: "glb.glb / H12_demo.skp",
    summary:
      "One storey under a thin black roof: a kitchen, a bath and two rooms behind sliding glass, opening onto a deep timber terrace.",
    specs: [
      { label: "Footprint", value: "12 × 12 m" },
      { label: "Height", value: "2.7 m" },
      { label: "Floors", value: "1" },
      { label: "Outside", value: "Covered terrace" },
    ],
    cover: shot("pavilion-1", "Low black pavilion with a timber screen and a glass railing around the terrace", "Terrace front"),
    shots: [
      shot("pavilion-2", "Teak dining table on the covered terrace behind a slatted timber screen", "Dining terrace"),
      shot("pavilion-3", "Slatted timber screen and sliding glass doors under the black roof", "Timber screen"),
      shot("pavilion-4", "Side of the pavilion clad in dark panels, the terrace at the end", "Dark cladding"),
    ],
  },
  {
    id: "slope",
    name: "Slope",
    type: "Two-storey house",
    source: "villa.fbx + villa.rar",
    summary:
      "A white two-storey house under one tilted metal roof, with a black balcony, a louvred glass bay and a timber-gated carport.",
    specs: [
      { label: "Plot", value: "11 × 17.5 m" },
      { label: "Height", value: "8.6 m" },
      { label: "Floors", value: "2" },
      { label: "Roof", value: "Mono-pitch metal" },
    ],
    cover: shot("slope-1", "White two-storey house with a tilted roof, a black balcony and timber gates", "Street corner"),
    shots: [
      shot("slope-2", "Front of the house: balcony over the carport and the louvred stair tower", "Front"),
      shot("slope-3", "Back corner of the house with tall windows on both floors", "Garden side"),
      shot("slope-4", "Close look at the black balcony railing and the white louvres", "Balcony"),
    ],
  },
  {
    id: "lounge",
    name: "Lounge",
    type: "Living room",
    source: "TV+Room+by+Deline.FBX",
    summary:
      "A living room with a full-height glass wall, a dark green feature wall, floating shelves and a low beige sofa on a teal rug.",
    specs: [
      { label: "Room", value: "4 × 6.6 m" },
      { label: "Ceiling", value: "2.75 m" },
      { label: "Window", value: "Floor to ceiling" },
      { label: "Walls", value: "Dark green" },
    ],
    cover: shot("lounge-1", "Living room with a glass wall on the left, a sofa, a TV and floating shelves", "Whole room"),
    shots: [
      shot("lounge-2", "Sun through the glass wall casting window shadows on the wooden floor", "Window light"),
      shot("lounge-3", "TV wall with white floating cabinets above a long shelf", "TV wall"),
      shot("lounge-4", "Side wall with gold picture frames and wall lamps above the sofa", "Picture wall"),
    ],
  },
];

// วิดีโอเต็มจอหน้าแรก: กล้องค่อยๆ ลอยเลียบสระของ MONOLITH (อัดจากโมเดลบ้านตัวละเอียด)
// จอคอม = 1600×900 / มือถือ = 960×540 (ไฟล์เล็กกว่า 3 เท่า เบราว์เซอร์เลือกเองจากความกว้างจอ)
export const HOUSE_FILM = {
  src: "/video/house/hero.mp4",
  small: "/video/house/hero-sm.mp4",
  poster: "/video/house/hero.webp",
};
// วิดีโอช่วงภายในบ้าน: กล้องค่อยๆ เลื่อนในห้อง LOUNGE (อัดจากโมเดลห้องจริง)
export const ROOM_FILM = { src: "/video/house/lounge.mp4", poster: "/video/house/lounge.webp" };
// โมเดลที่หมุนดูได้สดๆ ในหน้า (ตัวเดียวกับในวงโคจรหน้าแรก ไฟล์เล็ก 6.5 MB)
export const LIVE_MODEL = "/models/house/villa-ring.glb";
