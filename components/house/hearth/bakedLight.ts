// แสงที่ "อบ" ไว้จาก Cycles (scripts/hearth) → ใส่เข้า shader ของ three.js
// - ผนัง/พื้น/ฝ้า (shell_lm): รูป lightmap 3 รูป (กลางวันห้องว่าง / กลางวันเฟอร์นิเจอร์ครบ / กลางคืน) ผสมกันใน shader
//   กลางวัน: มุมไหนเฟอร์นิเจอร์เด้งขึ้นแล้ว ใช้รูป "ครบ" (มีเงาใต้เฟอร์นิเจอร์) เฉพาะในกรอบของมุมนั้น
// - ชิ้นอื่นทั้งหมด: แสงที่อบติดมากับจุดยอด (_bake_day / _bake_night) ผสมกลางวัน→กลางคืนด้วย uNight
// - ภาพ 360° ของห้อง (env) ใช้ทำเงาสะท้อนอย่างเดียว ปิดแสงกระจายจาก env (ไม่งั้นสว่างซ้ำสองรอบ)
// ตัวเลขทั้งหมดต้องตรงกับตอนแปลงไฟล์ ดู scripts/hearth/README.md "กติกาฝั่งหน้าเว็บ"

import * as THREE from "three";
import { HEARTH } from "@/config/hearth";

// ---------- tone mapping: AgX + contrast แบบ "Medium High Contrast" ของ Blender ----------
// ภาพในเว็บจะได้สีและความเข้มเหมือนภาพเรนเดอร์ Cycles ที่ใช้ตั้งค่าแสง
// (three.js เปิดช่อง CustomToneMapping ไว้ให้เขียนเอง: แทนที่ฟังก์ชันว่างในโค้ด shader กลาง ทำครั้งเดียว)
const MARK = "/* hearth-agx */";
export function installToneMapping() {
  const chunk = THREE.ShaderChunk.tonemapping_pars_fragment;
  if (chunk.includes(MARK)) return;
  THREE.ShaderChunk.tonemapping_pars_fragment = chunk.replace(
    "vec3 CustomToneMapping( vec3 color ) { return color; }",
    `${MARK}
vec3 CustomToneMapping( vec3 color ) {
  const mat3 AgXInsetMatrix = mat3( vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ), vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ), vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 ) );
  const mat3 AgXOutsetMatrix = mat3( vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ), vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ), vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 ) );
  const float AgxMinEv = - 12.47393;
  const float AgxMaxEv = 4.026069;
  color *= toneMappingExposure;
  color = AgXInsetMatrix * ( LINEAR_SRGB_TO_LINEAR_REC2020 * color );
  color = clamp( ( log2( max( color, 1e-10 ) ) - AgxMinEv ) / ( AgxMaxEv - AgxMinEv ), 0.0, 1.0 );
  color = clamp( ( color - 0.606 ) * 1.2 + 0.606, 0.0, 1.0 );
  color = AgXOutsetMatrix * agxDefaultContrastApprox( color );
  color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
  return clamp( LINEAR_REC2020_TO_LINEAR_SRGB * color, 0.0, 1.0 );
}`,
  );
}

// ---------- ค่าที่ทุกวัสดุใช้ร่วมกัน (หน้าเว็บเปลี่ยนค่าเหล่านี้ทุกเฟรม) ----------
export type BakeUniforms = ReturnType<typeof createBakeUniforms>;

export function createBakeUniforms(lmFull: THREE.Texture, lmNight: THREE.Texture) {
  return {
    uNight: { value: 0 }, // 0 = กลางวัน → 1 = กลางคืน
    uEnvDiffuse: { value: 0 }, // แสงกระจายจาก env (0 = ปิด ใช้แสงที่อบแทน)
    uBakeK: { value: HEARTH.vertexScale * Math.PI },
    uLmK: { value: HEARTH.lightmapScale.day * Math.PI },
    uLmNightK: { value: HEARTH.lightmapScale.night * Math.PI },
    uLmFull: { value: lmFull },
    uLmNight: { value: lmNight },
    // กรอบของแต่ละมุมบนพื้น (xMin, zMin, xMax, zMax) เรียง sofa, fire, dining, kitchen
    uZones: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
    uZoneOn: { value: new THREE.Vector4() }, // เฟอร์นิเจอร์ของแต่ละมุมโผล่มาแล้วแค่ไหน (0–1)
  };
}

// ชิ้นที่มีแสงอบต่อจุดยอด: ค่าในไฟล์ = √(แสง / 4) 8 บิต → ยกกำลังสองกลับก่อนเฉลี่ยข้ามสามเหลี่ยม
export function patchVertexBaked(m: THREE.Material, U: BakeUniforms) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader =
      "attribute vec4 _bake_day;\nattribute vec4 _bake_night;\nuniform float uNight;\nvarying vec3 vBake;\n" +
      sh.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvBake = mix(_bake_day.rgb * _bake_day.rgb, _bake_night.rgb * _bake_night.rgb, uNight);",
      );
    sh.fragmentShader =
      "uniform float uBakeK;\nuniform float uEnvDiffuse;\nvarying vec3 vBake;\n" +
      sh.fragmentShader.replace(
        "#include <lights_fragment_maps>",
        "#include <lights_fragment_maps>\nirradiance += vBake * uBakeK;\niblIrradiance *= uEnvDiffuse;",
      );
  };
  m.customProgramCacheKey = () => "hearth-vbake";
}

// ผนัง/พื้น/ฝ้า: lightmap (พิกัดรูปอยู่ใน uv1) — ตัว lightMap ของ three.js ใช้รูป "ห้องว่าง" แล้วเราแทนที่ผลด้วยรูปที่ผสมเอง
export function patchLightmapped(m: THREE.MeshStandardMaterial, U: BakeUniforms, lmEmpty: THREE.Texture) {
  m.lightMap = lmEmpty;
  m.lightMapIntensity = 1;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader =
      "varying vec3 vWPos;\n" +
      sh.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    sh.fragmentShader =
      `uniform float uNight, uEnvDiffuse, uLmK, uLmNightK;
uniform sampler2D uLmFull, uLmNight;
uniform vec4 uZones[4];
uniform vec4 uZoneOn;
varying vec3 vWPos;
// จุดนี้อยู่ในกรอบของมุมนั้นแค่ไหน (ขอบนุ่ม 30 ซม. เงาจะได้ไม่ขึ้นเป็นเส้นตรง)
float zoneIn(vec4 z) {
  vec2 a = smoothstep(z.xy - 0.3, z.xy + 0.05, vWPos.xz) * (1.0 - smoothstep(z.zw - 0.05, z.zw + 0.3, vWPos.xz));
  return a.x * a.y;
}
` +
      sh.fragmentShader.replace(
        "#include <lights_fragment_maps>",
        `#include <lights_fragment_maps>
{
  float full = max(max(zoneIn(uZones[0]) * uZoneOn.x, zoneIn(uZones[1]) * uZoneOn.y), max(zoneIn(uZones[2]) * uZoneOn.z, zoneIn(uZones[3]) * uZoneOn.w));
  vec3 day = mix(lightMapTexel.rgb, texture2D(uLmFull, vLightMapUv).rgb, full) * uLmK;
  vec3 nite = texture2D(uLmNight, vLightMapUv).rgb * uLmNightK;
  irradiance += mix(day, nite, uNight) - lightMapIrradiance;
  iblIrradiance *= uEnvDiffuse;
}`,
      );
  };
  m.customProgramCacheKey = () => "hearth-lmbake";
}
