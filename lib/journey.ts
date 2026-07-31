// 경로 탐색 (개편 §2): 장소→장소, 직통 + 환승 1회, 예상 시간 오름차순
// 예상 시간 가정(화면에 "예상"으로 표기): 도보 67m/분, 첫차 대기 6분, 정류장당 2분, 환승 대기 8분
import routesRaw from "./data/routes.json";
import slimStops from "./data/stops.slim.json";
import type { SlimStop } from "./types";
import { distanceM } from "./geo";

interface RouteDef {
  routeId: string;
  routeNo: string;
  stops: string[];
}

const ROUTES = (routesRaw as { routes: RouteDef[] }).routes;
const ALL = slimStops as SlimStop[];
const byId = new Map(ALL.map((s) => [s.id, s]));

// 인덱스: 정류장 → [노선idx, 순번], 이름 → 동명 id들
const stopRoutes = new Map<string, [number, number][]>();
ROUTES.forEach((r, ri) =>
  r.stops.forEach((sid, si) => {
    const l = stopRoutes.get(sid) ?? [];
    l.push([ri, si]);
    stopRoutes.set(sid, l);
  }),
);
const idsByName = new Map<string, string[]>();
for (const s of ALL) {
  const l = idsByName.get(s.name) ?? [];
  l.push(s.id);
  idsByName.set(s.name, l);
}

export interface Place {
  name: string;
  lat: number;
  lng: number;
}

export interface WalkLeg {
  kind: "walk";
  from: string;
  to: string;
  minutes: number;
}

export interface BusLeg {
  kind: "bus";
  routeNo: string;
  boardId: string;
  boardName: string;
  boardFac: string; // 시설 5종 코드 (칩 표시용)
  alightId: string;
  alightName: string;
  rideStops: number;
  path: [number, number][]; // 지도 폴리라인용 [lat,lng] (탑승~하차 경유 정류장)
}

export type Leg = WalkLeg | BusLeg;

export interface Journey {
  id: string;
  estMinutes: number;
  transfers: number;
  legs: Leg[];
}

export interface JourneyState {
  origin: Place;
  dest: Place;
  candidates: Journey[];
  selectedId: string | null;
}

const WALK_SPEED = 67; // m/분
export const FIRST_WAIT = 6; // 첫차 대기 가정(분)
export const PER_STOP = 2; // 정류장당 소요 가정(분)
export const TRANSFER_WAIT = 8; // 환승 대기 가정(분)

function nearStops(p: Place, radius = 600, top = 4): (SlimStop & { walkMin: number })[] {
  return ALL.map((s) => ({ ...s, d: distanceM(p.lat, p.lng, s.lat, s.lng) }))
    .filter((s) => s.d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, top)
    .map((s) => ({ ...s, walkMin: Math.max(1, Math.round(s.d / WALK_SPEED)) }));
}

function busLeg(ri: number, i: number, j: number): BusLeg {
  const r = ROUTES[ri];
  const board = byId.get(r.stops[i]);
  const alight = byId.get(r.stops[j]);
  const path: [number, number][] = [];
  for (let k = i; k <= j; k++) {
    const s = byId.get(r.stops[k]);
    if (s) path.push([s.lat, s.lng]);
  }
  return {
    kind: "bus",
    // 괄호 변형("7-1(창촌농공단지경유)")은 표기·병합 시 번호만 사용
    routeNo: r.routeNo.replace(/\(.*\)$/, ""),
    boardId: r.stops[i],
    boardName: board?.name ?? r.stops[i],
    boardFac: board?.fac ?? "uuuuu",
    alightId: r.stops[j],
    alightName: alight?.name ?? r.stops[j],
    rideStops: j - i,
    path,
  };
}

export function planJourneys(origin: Place, dest: Place): Journey[] {
  const deps = nearStops(origin);
  const arrs = nearStops(dest);
  if (deps.length === 0 || arrs.length === 0) return [];
  const arrWalk = new Map(arrs.map((a) => [a.id, a.walkMin]));

  const out: Journey[] = [];
  const push = (legs: Leg[], transfers: number) => {
    const est = legs.reduce(
      (sum, l) => sum + (l.kind === "walk" ? l.minutes : l.rideStops * PER_STOP),
      FIRST_WAIT + transfers * TRANSFER_WAIT,
    );
    const key = legs
      .filter((l): l is BusLeg => l.kind === "bus")
      .map((l) => `${l.routeNo}@${l.boardId}`)
      .join(">");
    out.push({ id: key, estMinutes: Math.round(est), transfers, legs });
  };

  for (const dep of deps) {
    const walkStart: WalkLeg = { kind: "walk", from: origin.name, to: dep.name, minutes: dep.walkMin };

    for (const [ri, i] of stopRoutes.get(dep.id) ?? []) {
      const r = ROUTES[ri];
      // 직통
      for (let j = i + 1; j < r.stops.length; j++) {
        const w = arrWalk.get(r.stops[j]);
        if (w !== undefined) {
          push(
            [walkStart, busLeg(ri, i, j), { kind: "walk", from: byId.get(r.stops[j])?.name ?? "", to: dest.name, minutes: w }],
            0,
          );
          break;
        }
      }
      // 환승 1회: 첫 노선의 이후 정류장(최대 35개)에서 갈아타기
      for (let k = i + 1; k < Math.min(i + 36, r.stops.length); k++) {
        const tId = r.stops[k];
        const tName = byId.get(tId)?.name;
        if (!tName) continue;
        for (const t2 of idsByName.get(tName) ?? [tId]) {
          for (const [ri2, i2] of stopRoutes.get(t2) ?? []) {
            if (ri2 === ri) continue;
            const r2 = ROUTES[ri2];
            for (let j2 = i2 + 1; j2 < r2.stops.length; j2++) {
              const w = arrWalk.get(r2.stops[j2]);
              if (w !== undefined) {
                const legs: Leg[] = [walkStart, busLeg(ri, i, k)];
                if (t2 !== tId) legs.push({ kind: "walk", from: tName, to: `${tName} (건너편)`, minutes: 1 });
                legs.push(busLeg(ri2, i2, j2));
                legs.push({ kind: "walk", from: byId.get(r2.stops[j2])?.name ?? "", to: dest.name, minutes: w });
                push(legs, 1);
                break;
              }
            }
          }
        }
      }
    }
  }

  // 중복 제거(같은 노선·탑승 조합은 최단만) 후 예상 시간순, 직통 우선 동점 처리
  const best = new Map<string, Journey>();
  for (const j of out) {
    const prev = best.get(j.id);
    if (!prev || j.estMinutes < prev.estMinutes) best.set(j.id, j);
  }
  return [...best.values()]
    .sort((a, b) => a.estMinutes - b.estMinutes || a.transfers - b.transfers)
    .slice(0, 12);
}

// 추천 2개 (v5): 버스 번호가 달라도 탑승·하차 정류장 시퀀스가 같으면 같은 경로로 묶고
// (노선 번호 병합 표기), 서로 다른 경로 중 최소 시간 2개를 추천
export function recommendJourneys(origin: Place, dest: Place): Journey[] {
  const all = planJourneys(origin, dest);
  const groups = new Map<string, Journey>();
  for (const j of all) {
    // 경로 동일성 키 = 버스 구간의 (탑승→하차) 정류장 시퀀스
    const key = j.legs
      .filter((l): l is BusLeg => l.kind === "bus")
      .map((l) => `${l.boardId}>${l.alightId}`)
      .join("|");
    const prev = groups.get(key);
    if (!prev) {
      groups.set(key, structuredClone(j));
    } else {
      // 같은 경로 — 노선 번호만 병합 ("7-1·7-S번"), 더 짧은 예상 시간 유지
      const pb = prev.legs.filter((l): l is BusLeg => l.kind === "bus");
      const jb = j.legs.filter((l): l is BusLeg => l.kind === "bus");
      pb.forEach((leg, i) => {
        const add = jb[i]?.routeNo;
        if (add && !leg.routeNo.split("·").includes(add)) leg.routeNo = `${leg.routeNo}·${add}`;
      });
      if (j.estMinutes < prev.estMinutes) prev.estMinutes = j.estMinutes;
    }
  }
  return [...groups.values()]
    .sort((a, b) => a.estMinutes - b.estMinutes || a.transfers - b.transfers)
    .slice(0, 2);
}
