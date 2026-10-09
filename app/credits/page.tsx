import type { Metadata } from "next";
import Link from "next/link";
import { credits, LICENSES, trademarks } from "@/config/credits";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: `Credits — ${site.name} ${site.byline}`,
  description: "3D models, photos, video and imagery used in this portfolio, with their authors and licences.",
};

// หน้าเครดิต: สร้างจาก config/credits.ts ทั้งหมด (เพิ่มโมเดลใหม่ ไม่ต้องแก้หน้านี้)
// ลิงก์ออกนอกเว็บใช้ <a> ธรรมดา (Link ของ Next ใช้กับหน้าในเว็บเรา)
export default function Credits() {
  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-6 py-20 motion-safe:animate-fade-in">
      <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Credits</p>
      <h1 className="mt-4 font-display text-5xl font-light sm:text-6xl">Built on the work of others.</h1>
      <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/60">
        {site.name} is a non-commercial portfolio. The products are concepts, not real listings. The Earth
        imagery, 3D models, photos and video below were made by these creators and are used under their licences.
      </p>

      <ul className="mt-12 divide-y divide-white/10 border-y border-white/10">
        {credits.map((c) => (
          <li key={c.source} className="py-6">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">{c.usedFor}</p>
            <p className="mt-2 font-display text-2xl">
              <a href={c.source} className="underline-offset-4 hover:underline">
                {c.title}
              </a>
            </p>
            <p className="mt-1 text-sm text-white/70">
              by{" "}
              <a href={c.authorUrl} className="underline underline-offset-4">
                {c.author}
              </a>{" "}
              ·{" "}
              <a href={LICENSES[c.license]} className="underline underline-offset-4">
                {c.license}
              </a>
            </p>
            <p className="mt-1 text-sm text-white/45">Changes: {c.changes}</p>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-xs leading-relaxed text-white/40">
        Names, logos and liveries shown in the models belong to their owners. This is a fan-made concept and
        is not affiliated with or endorsed by {trademarks.join("; ")}.
      </p>

      <Link
        href="/"
        className="mt-12 inline-block text-[11px] uppercase tracking-[0.3em] text-white/70 underline-offset-8 hover:underline"
      >
        ← Back to orbit
      </Link>
    </main>
  );
}
