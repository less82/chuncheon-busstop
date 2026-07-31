// 서버 전용: 전체 정류장 데이터 (1.1MB — 클라이언트 번들에 넣지 말 것)
// 클라이언트 검색은 lib/data/stops.slim.json 사용
import "server-only";
import type { FullStop, Shelter, CoolingFacility } from "./types";
import stopsRaw from "./data/stops.json";
import sheltersRaw from "./data/shelters.json";
import coolingRaw from "./data/cooling.json";
import { distanceM } from "./geo";

const stops = (stopsRaw as { stops: FullStop[] }).stops;
const byId = new Map(stops.map((s) => [s.id, s]));

export function getStop(id: string): FullStop | undefined {
  return byId.get(id);
}

export function getAllStops(): FullStop[] {
  return stops;
}

export const shelters = sheltersRaw as Shelter[];
export const cooling = coolingRaw as CoolingFacility[];

// 정류장 최근접 무더위쉼터 / 그늘막 (spec §3.4 근처 쉼터)
export function nearestShelter(lat: number, lng: number) {
  let best: { shelter: Shelter; dist: number } | null = null;
  for (const s of shelters) {
    if (!s.operating) continue;
    const d = distanceM(lat, lng, s.lat, s.lng);
    if (!best || d < best.dist) best = { shelter: s, dist: d };
  }
  return best;
}

export function nearestCooling(lat: number, lng: number) {
  let best: { facility: CoolingFacility; dist: number } | null = null;
  for (const c of cooling) {
    const d = distanceM(lat, lng, c.lat, c.lng);
    if (!best || d < best.dist) best = { facility: c, dist: d };
  }
  return best;
}
