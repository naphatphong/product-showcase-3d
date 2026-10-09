"use client";

import Image from "next/image";
import Reveal from "@/components/Reveal";
import { HERITAGE } from "@/config/f1";

// หน้าประวัติของ GRID 26 (แบบโปสเตอร์ของเว็บ Longbow): หัวข้อตัวใหญ่ + ไทม์ไลน์ 5 ปีสำคัญของทีม Red Bull Racing
// - คอม: 5 คอลัมน์คั่นด้วยเส้นกริดบางๆ แบบแบบวิศวกรรม รูปขาวดำ ชี้เมาส์แล้วเป็นสี
// - มือถือ: เรียงเป็นรายการลงมา รูปเล็กด้านซ้าย
// รูปยังไม่มา (ยังไม่ได้ใส่ photo ใน config/f1.ts) = กรอบลายเส้นเฉียงพร้อมชื่อรถแทนรูป
export default function HeritageSection({ active }: { active: boolean }) {
  return (
    <div data-active={active} className="overlay pointer-events-none fixed inset-0 z-[3]">
      <div className="f1-heritage">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="f1-label reveal-fade">[ Heritage ]</p>
            <h2 className="f1-title mt-3 text-[clamp(3rem,8.4vw,8.6rem)]">
              <Reveal text="Since 2005." delay={0.05} step={0.03} />
            </h2>
          </div>
          <p className="f1-heritage-intro reveal-fade max-w-[23rem] text-[13.5px] leading-relaxed text-[var(--f1-muted)] md:pb-2 md:text-[14.5px]">
            In November 2004 Red Bull bought the Jaguar team from Ford for a symbolic one dollar. Twenty-one seasons
            later it has won six constructors&apos; and eight drivers&apos; championships.
          </p>
        </div>

        <ol className="f1-eras">
          {HERITAGE.map((era, i) => (
            <li key={era.year} className="f1-era reveal-fade" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>
              <div className="f1-photo">
                {era.photo ? (
                  <Image
                    src={era.photo.src}
                    alt={era.photo.alt}
                    fill
                    sizes="(min-width: 768px) 20vw, 72px"
                    className="object-cover"
                  />
                ) : (
                  <span aria-hidden className="f1-photo-empty">
                    {era.car}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="f1-title text-[clamp(1.7rem,2.7vw,2.6rem)]">{era.year}</p>
                <p className="f1-label mt-1.5 text-[9.5px] md:mt-2 md:text-[10px]">
                  <span className="text-[var(--f1-red)]">{era.car}</span> · {era.title}
                </p>
                <p className="f1-era-text mt-1.5 text-[12px] leading-snug text-[var(--f1-muted)] md:mt-2 md:text-[13px]">
                  {era.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
