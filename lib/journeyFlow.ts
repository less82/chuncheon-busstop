// 실시간 경로 플로우의 타임라인 빌드 (v6.3): 순수 함수 — 컴포넌트·테스트가 공유
import slimStops from "./data/stops.slim.json";
import sheltersRaw from "./data/shelters.json";
import type { SlimStop, Shelter } from "./types";
import { distanceM } from "./geo";
import { FIRST_WAIT, TRANSFER_WAIT, pathMinutes, type BusLeg, type Journey, type Place } from "./journey";

const ALL = slimStops as SlimStop[];
const byId = new Map(ALL.map((s) => [s.id, s]));
const byCoord = new Map(ALL.map((s) => [`${s.lat},${s.lng}`, s.name]));
const SHELTERS = (sheltersRaw as Shelter[]).filter((s) => s.operating);

export type Role = "출발" | "승차" | "환승" | "하차" | "도착";

export interface FlowNode {
  role: Role;
  name: string;
  lat: number;
  lng: number;
  stopId?: string; // 정류장 노드만
  fac?: string;
  routeNo?: string; // 이 정류장에서 탈 후보 버스(병합 표기, 표시는 1대만)
  ride?: number; // 이 정류장에서 타고 갈 정류장 수
  waitMin: number; // 이 노드에서의 대기 가정
  outMin: number; // 다음 노드까지 이동 시간(남은 시간 계산용)
  shelter?: { name: string; lat: number; lng: number; dist: number };
  remMin: number; // 이 노드부터 도착까지 예상(분)
}

// 위치 후보: 타임라인 노드 + 버스 구간의 경유 정류장 (GPS 최근접·시연 스텝이 공유)
export interface FlowPos {
  kind: "node" | "riding";
  nodeIdx: number; // node면 해당 노드, riding이면 직전 승차/환승 노드
  name: string;
  lat: number;
  lng: number;
  remMin: number;
  stopsLeft?: number; // riding: 하차까지 남은 정류장 수
  alightName?: string;
}

// 안내 화면 지도는 축척 50m — 그 안에 들어오는 쉼터만 "여기서 쉴 수 있다"고 말할 수 있다
export const SHELTER_NEAR_M = 50;

function nearestShelter(lat: number, lng: number): { name: string; lat: number; lng: number; dist: number } | undefined {
  let best: Shelter | null = null;
  let bd = Infinity;
  for (const sh of SHELTERS) {
    const d = distanceM(lat, lng, sh.lat, sh.lng);
    if (d < bd) { bd = d; best = sh; }
  }
  if (!best || bd > SHELTER_NEAR_M) return undefined;
  return { name: best.name, lat: best.lat, lng: best.lng, dist: bd };
}

function stopNode(role: Role, stopId: string, fallbackName: string, routeNo?: string, waitMin = 0, ride?: number): FlowNode {
  const s = byId.get(stopId);
  const lat = s?.lat ?? 0;
  const lng = s?.lng ?? 0;
  return {
    role,
    name: s?.name ?? fallbackName,
    lat,
    lng,
    stopId,
    fac: s?.fac ?? "uuuuu",
    routeNo,
    ride,
    waitMin,
    outMin: 0,
    shelter: s ? nearestShelter(lat, lng) : undefined,
    remMin: 0,
  };
}

// 경로 → 타임라인 노드 (v7.1: 출발 주소 노드 없음 — 첫 항목이 승차 정류장).
// 남은 시간은 도착지부터 역방향 누적(도보·대기 포함)
export function buildNodes(j: Journey, dest: Place): FlowNode[] {
  const nodes: FlowNode[] = [];
  let pendingWalk = 0;
  let prevBus: BusLeg | null = null;

  for (const leg of j.legs) {
    if (leg.kind === "walk") { pendingWalk += leg.minutes; continue; }
    const prev = nodes[nodes.length - 1];
    if (prev) prev.outMin = pathMinutes(prevBus!.path) + pendingWalk;
    nodes.push(
      stopNode(prevBus === null ? "승차" : "환승", leg.boardId, leg.boardName, leg.routeNo,
        prevBus === null ? FIRST_WAIT : TRANSFER_WAIT, leg.rideStops),
    );
    prevBus = leg;
    pendingWalk = 0;
  }

  if (prevBus) {
    const prev = nodes[nodes.length - 1];
    prev.outMin = pathMinutes(prevBus.path);
    nodes.push(stopNode("하차", prevBus.alightId, prevBus.alightName));
    nodes[nodes.length - 1].outMin = pendingWalk;
  }
  nodes.push({ role: "도착", name: dest.name, lat: dest.lat, lng: dest.lng, waitMin: 0, outMin: 0, remMin: 0 });

  let rem = 0;
  for (let i = nodes.length - 1; i >= 0; i--) {
    rem += nodes[i].outMin + nodes[i].waitMin;
    nodes[i].remMin = rem;
  }
  return nodes;
}

// 노드 + 버스 경유 정류장을 시간 순서대로 펼친 위치 후보 목록
export function buildPositions(nodes: FlowNode[], j: Journey): FlowPos[] {
  const busLegs = j.legs.filter((l): l is BusLeg => l.kind === "bus");
  const out: FlowPos[] = [];
  let k = 0;
  nodes.forEach((n, i) => {
    out.push({ kind: "node", nodeIdx: i, name: n.name, lat: n.lat, lng: n.lng, remMin: n.remMin });
    if (n.role === "승차" || n.role === "환승") {
      const leg = busLegs[k++];
      const next = nodes[i + 1];
      if (!leg || !next) return;
      const inner = leg.path.slice(1, -1); // 승차·하차 제외한 경유 정류장
      inner.forEach(([lat, lng], idx) => {
        const stopsLeft = inner.length - idx; // 여기서 하차까지 남은 정류장 수
        out.push({
          kind: "riding",
          nodeIdx: i,
          name: byCoord.get(`${lat},${lng}`) ?? "이동 중",
          lat,
          lng,
          // 남은 승차 시간 = 이 경유 정류장(path 인덱스 idx+1)부터 하차까지 실거리 기반
          remMin: next.remMin + pathMinutes(leg.path, idx + 1),
          stopsLeft,
          alightName: leg.alightName,
        });
      });
    }
  });
  return out;
}
