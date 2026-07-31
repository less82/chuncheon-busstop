// 하버사인 직선거리 (m)
export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

// 도보 시간 (분) — 67m/분 (spec §3)
export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 67));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// 춘천 명동 (위치 권한 거부 시 기본 중심 — spec §3.2)
export const DEFAULT_CENTER = { lat: 37.8813, lng: 127.73 };
