import stopsJson from './data/stops.json';
import routesJson from './data/routes.json';
import sheltersJson from './data/cooling_shelters.json';
import { SHELTER_RADIUS_M } from './constants';
import { withinRadius } from './geo';
import type { BusRoute, CoolingShelter, DirectionResult, Stop } from './types';

export const STOPS = stopsJson as Stop[];
export const ROUTES = routesJson as BusRoute[];
export const SHELTERS = sheltersJson as CoolingShelter[];

const STOP_BY_ID = new Map(STOPS.map((s) => [s.id, s]));

export function getStop(id: string): Stop | undefined {
  return STOP_BY_ID.get(id);
}

export function getStopName(id: string): string {
  return STOP_BY_ID.get(id)?.name ?? id;
}

/** 좌표에서 가장 가까운 정류장 (제보 사진의 GPS를 정류장으로 자동 매칭) */
export function nearestStopTo(
  point: { lat: number; lng: number },
  maxDistanceM = 300,
): (Stop & { distanceM: number }) | null {
  const [closest] = withinRadius(point, STOPS, maxDistanceM);
  return closest ?? null;
}

/** 정류장 이름/별칭 부분 일치 검색 (음성 인식 결과의 공백·조사 흔들림 흡수) */
export function searchStops(query: string, limit = 8): Stop[] {
  const q = normalize(query);
  if (!q) return [];

  const scored = STOPS.map((stop) => {
    const name = normalize(stop.name);
    const alias = normalize(stop.alias ?? '');

    let score = -1;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 60;
    else if (alias.includes(q)) score = 40;
    else if (q.length >= 2 && name.includes(q.slice(0, 2))) score = 20;

    return { stop, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.stop.name.localeCompare(b.stop.name));

  return scored.slice(0, limit).map((s) => s.stop);
}

function normalize(value: string): string {
  return value.replace(/[\s·.,()]/g, '').toLowerCase();
}

/** 정류장을 지나는 노선 목록 */
export function routesAtStop(stopId: string): BusRoute[] {
  return ROUTES.filter((r) => r.stopIds.includes(stopId));
}

/**
 * 출발지 → 목적지 방면 자동 매핑.
 * 두 정류장을 모두 지나는 노선을 찾아 정차 순서로 진행 방향을 판정하고,
 * 해당 방향의 종점 이름을 "방면" 라벨로 사용한다.
 * (반대편 정류장에서 잘못 기다리는 문제를 막기 위한 핵심 로직)
 */
export function resolveDirections(originId: string, destinationId: string): DirectionResult[] {
  if (!originId || !destinationId || originId === destinationId) return [];

  const results: DirectionResult[] = [];

  for (const route of ROUTES) {
    const oIdx = route.stopIds.indexOf(originId);
    const dIdx = route.stopIds.indexOf(destinationId);
    if (oIdx === -1 || dIdx === -1 || oIdx === dIdx) continue;

    const bound = dIdx > oIdx ? 'forward' : 'backward';
    const headsign = bound === 'forward' ? route.headsignForward : route.headsignBackward;

    const slice =
      bound === 'forward'
        ? route.stopIds.slice(oIdx + 1, dIdx + 1)
        : route.stopIds.slice(dIdx, oIdx).reverse();

    results.push({
      routeId: route.id,
      routeNo: route.routeNo,
      routeType: route.routeType,
      headsign,
      bound,
      stopCount: slice.length,
      viaStopNames: slice.map(getStopName),
    });
  }

  return results.sort((a, b) => a.stopCount - b.stopCount);
}

/** 정류장 반경 30m 이내 쿨링쉘터 */
export function sheltersNearStop(stopId: string, radiusM = SHELTER_RADIUS_M) {
  const stop = getStop(stopId);
  if (!stop) return [];
  return withinRadius(stop, SHELTERS, radiusM);
}

/** 반경을 넓혀가며 최소 1곳은 안내 (30m 내 없을 때 대안 제시용) */
export function nearestShelters(stopId: string, limit = 3) {
  const stop = getStop(stopId);
  if (!stop) return [];
  return withinRadius(stop, SHELTERS, 100_000).slice(0, limit);
}

/** 시설 상태 집계 — 관리자 커버리지 스택바용 */
export function facilityCoverage() {
  const keys = ['shade', 'bench', 'shelter', 'bit', 'light'] as const;
  return keys.map((key) => {
    const counts = { yes: 0, no: 0, unknown: 0 };
    for (const stop of STOPS) counts[stop.facilities[key]] += 1;
    return { key, ...counts, total: STOPS.length };
  });
}
