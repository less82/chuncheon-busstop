// 클라이언트 검색 (1,890개 슬림 인덱스 — spec §3.2)
import type { SlimStop } from "./types";
import { distanceM } from "./geo";

// 시설 있음 개수 (편한순 정렬용)
export function facilityScore(s: SlimStop): number {
  let n = 0;
  for (const c of s.fac) if (c === "y") n++;
  return n;
}

export function searchStops(all: SlimStop[], query: string): SlimStop[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, "");
  if (!q) return [];
  return all.filter(
    (s) => s.name.toLowerCase().replace(/\s+/g, "").includes(q) || s.no.includes(q),
  );
}

export function sortByDistance(
  list: SlimStop[],
  center: { lat: number; lng: number },
): (SlimStop & { dist: number })[] {
  return list
    .map((s) => ({ ...s, dist: distanceM(center.lat, center.lng, s.lat, s.lng) }))
    .sort((a, b) => a.dist - b.dist);
}

// 편한순: 시설 있음 개수 내림차순, 동점 시 거리순 (spec §3.2)
export function sortByComfort(
  list: (SlimStop & { dist: number })[],
): (SlimStop & { dist: number })[] {
  return [...list].sort((a, b) => facilityScore(b) - facilityScore(a) || a.dist - b.dist);
}
