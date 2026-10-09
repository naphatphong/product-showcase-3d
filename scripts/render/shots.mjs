// อัดรูปนิ่งและวิดีโอของหน้า /house จากโมเดล 3D ตัวจริง (กล้องทุกตัวเก็บไว้ใน shots.json)
// กติกา: รูปในหน้าบ้านต้องมาจากโมเดลของบ้านหลังนั้นเอง → เปลี่ยนโมเดลเมื่อไร ให้รันสคริปต์นี้ใหม่
//
// วิธีใช้ (รันที่โฟลเดอร์บนสุดของโปรเจกต์):
//   1) เปิดเซิร์ฟเวอร์ไฟล์:            python3 -m http.server 8765
//   2) รูปนิ่งทั้งหมด หรือเฉพาะหลัง:    node scripts/render/shots.mjs [monolith|pavilion|slope|lounge]
//      → public/photos/house/<ชื่อ>.webp (1600×900)
//   3) วิดีโอ:                         node scripts/render/shots.mjs --film hero|lounge
//      → ภาพทีละเฟรมใน .render/<ชื่อ>/ แล้วพิมพ์คำสั่ง ffmpeg สำหรับรวมเป็น .mp4
// ต้องมี: playwright-core (npm i -D playwright-core) + Chromium / sharp มากับ Next อยู่แล้ว
// โมเดลที่ไม่ได้อยู่ใน public (บ้าน H12, villa, ห้อง TV) แปลงจากไฟล์ที่ Blue โหลดมาด้วย FBX2glTF
// แล้ววางไว้ใน scripts/render/models/ (ไม่ขึ้น git เพราะไฟล์ใหญ่)
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";

const BASE = `http://localhost:${process.env.PORT ?? 8765}/scripts/render/render.html`;
const jobs = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "shots.json"), "utf8"));
const args = process.argv.slice(2);

// เปิดหน้าอัดภาพ รอโมเดลโหลดเสร็จ
async function open(browser, model, params, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`${BASE}?m=${model}&${params}&w=${w}&h=${h}`);
  await page.waitForFunction("window.DONE", null, { timeout: 900000, polling: 1000 });
  const info = await page.evaluate("window.INFO");
  if (info.error) throw new Error(`${model}: ${info.error}`);
  return page;
}

{
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM, // ไม่ใส่ = ใช้ Chromium ของ Playwright
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });

  if (args[0] === "--film") {
    // วิดีโอวนลูป: กล้องเคลื่อนจาก A ไป B แล้วกลับมา A แบบนุ่ม (cosine) เฟรมสุดท้ายต่อกับเฟรมแรกพอดี
    const f = jobs.films.find((x) => x.name === args[1]);
    const out = path.join(".render", f.name);
    fs.mkdirSync(out, { recursive: true });
    const page = await open(browser, f.model, f.params, f.w, f.h);
    const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    for (let i = 0; i < f.frames; i++) {
      const file = path.join(out, `f${String(i).padStart(4, "0")}.png`);
      if (fs.existsSync(file)) continue; // อัดต่อจากเดิมได้ถ้าหยุดกลางทาง
      const t = (1 - Math.cos((2 * Math.PI * i) / f.frames)) / 2;
      await page.evaluate(([p, l, fov]) => window.shotArr(p, l, fov), [lerp(f.A, f.B, t), lerp(f.LA, f.LB, t), f.fov]);
      await page.screenshot({ path: file });
      if (i % 20 === 0) console.log(f.name, i, "/", f.frames);
    }
    console.log(
      `ffmpeg -framerate 24 -i ${out}/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 27 -preset slow -tune film -movflags +faststart public/video/house/${f.name}.mp4`,
    );
  } else {
    for (const job of jobs.stills.filter((j) => !args[0] || j.home === args[0])) {
      const page = await open(browser, job.model, job.params, 1600, 900);
      for (const s of job.shots) {
        await page.evaluate((s) => window.shotArr(s.pos, s.look, s.fov), s);
        const png = await page.screenshot();
        await sharp(png).webp({ quality: 84, effort: 6 }).toFile(`public/photos/house/${s.name}.webp`);
        console.log(job.home, s.name);
      }
      await page.close();
    }
  }
  await browser.close();
}
