// แปลงพิกัดเป็นข้อความอ่านง่าย เช่น { lat: 35.68, lon: 139.69 } → "35.68° N · 139.69° E"
export function formatCoords({ lat, lon }: { lat: number; lon: number }) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns} · ${Math.abs(lon).toFixed(2)}° ${ew}`;
}
