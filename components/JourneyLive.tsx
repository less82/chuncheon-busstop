"use client";

// 실시간 경로 플로우 (v6.2): 왼쪽 진행 레일 + 승차/환승/하차 박스 타임라인.
// - 버스는 '가장 빨리 오는 한 대'만 표시 (TAGO 실시간, 없으면 대표 번호 폴백)
// - 걷기 시간은 표시하지 않음 (남은 시간 계산에는 포함)
// - 내 위치(GPS watch)에 따라 레일의 현재 점이 위→아래로 내려감
// - ?demo=1 : 시연 모드 — GPS 대신 버튼으로 현재 위치를 한 칸씩 이동 (데이터는 전부 실데이터)
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import slimStops from "@/lib/data/stops.slim.json";
import sheltersRaw from "@/lib/data/shelters.json";
import type { SlimStop, Shelter } from "@/lib/types";
import type { Arrival } from "@/lib/arrivals";
import { distanceM, formatDistance } from "@/lib/geo";
import { loadJourneyState } from "@/lib/journeyStore";
import { FIRST_WAIT, PER_STOP, TRANSFER_WAIT, type BusLeg, type Journey, type Place } from "@/lib/journey";
import FacilityChips from "./FacilityChips";

const ALL = slimStops as SlimStop[];
const byId = new Map(ALL.map((s) => [s.id, s]));
const SHELTERS = (sheltersRaw as Shelter[]).filter((s) => s.operating);

type Role = "출발" | "승차" | "환승" | "하차" | "도착";

interface FlowNode {
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
  shelter?: { name: string; dist: number };
  remMin: number; // 이 노드부터 도착까지 예상(분)
}

function nearestShelter(lat: number, lng: number): { name: string; dist: number } | undefined {
  let best: Shelter | null = null;
  let bd = Infinity;
  for (const sh of SHELTERS) {
    const d = distanceM(lat, lng, sh.lat, sh.lng);
    if (d < bd) { bd = d; best = sh; }
  }
  return best ? { name: best.name, dist: bd } : undefined;
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

// 경로 → 타임라인 노드. 남은 시간은 도착지부터 역방향 누적(도보·대기 포함)
function buildNodes(j: Journey, origin: Place, dest: Place): FlowNode[] {
  const nodes: FlowNode[] = [
    { role: "출발", name: origin.name, lat: origin.lat, lng: origin.lng, waitMin: 0, outMin: 0, remMin: 0 },
  ];
  let pendingWalk = 0;
  let prevBus: BusLeg | null = null;

  for (const leg of j.legs) {
    if (leg.kind === "walk") { pendingWalk += leg.minutes; continue; }
    const prev = nodes[nodes.length - 1];
    prev.outMin = prevBus === null ? pendingWalk : prevBus.rideStops * PER_STOP + pendingWalk;
    nodes.push(
      stopNode(prevBus === null ? "승차" : "환승", leg.boardId, leg.boardName, leg.routeNo,
        prevBus === null ? FIRST_WAIT : TRANSFER_WAIT, leg.rideStops),
    );
    prevBus = leg;
    pendingWalk = 0;
  }

  if (prevBus) {
    const prev = nodes[nodes.length - 1];
    prev.outMin = prevBus.rideStops * PER_STOP;
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

const ROLE_STYLE: Record<Role, string> = {
  출발: "bg-white text-muted ring-1 ring-line",
  승차: "bg-primary text-white",
  환승: "bg-warn text-white",
  하차: "bg-ink text-white",
  도착: "bg-white text-muted ring-1 ring-line",
};

type ArrState = Record<string, { ok: boolean; list: Arrival[] }>;

export default function JourneyLive() {
  const router = useRouter();
  const params = useSearchParams();
  const demo = params.get("demo") === "1"; // 시연 모드
  const [data, setData] = useState<{ j: Journey; origin: Place; dest: Place } | null>(null);
  const [arr, setArr] = useState<ArrState>({});
  const [gpsIdx, setGpsIdx] = useState<number | null>(null);
  const [demoIdx, setDemoIdx] = useState(0);

  useEffect(() => {
    const s = loadJourneyState();
    const j = s?.candidates.find((c) => c.id === s.selectedId);
    if (!s || !j) { router.replace("/route"); return; }
    setData({ j, origin: s.origin, dest: s.dest });
  }, [router]);

  const nodes = useMemo(
    () => (data ? buildNodes(data.j, data.origin, data.dest) : null),
    [data],
  );

  // 승차·환승 정류장 도착정보 (TAGO 실시간, 30초 갱신) — 목업 없음, 실패는 실패로 표시
  useEffect(() => {
    if (!nodes) return;
    const targets = nodes.filter((n) => n.stopId && n.routeNo);
    if (targets.length === 0) return;
    let dead = false;
    const load = () => {
      for (const n of targets) {
        fetch(`/api/arrivals?stopId=${n.stopId}`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((d) => {
            if (dead) return;
            const routes = n.routeNo!.split("·");
            const list = (d.arrivals as Arrival[]).filter((a) => routes.includes(a.routeNo));
            setArr((p) => ({ ...p, [n.stopId!]: { ok: true, list } }));
          })
          .catch(() => { if (!dead) setArr((p) => ({ ...p, [n.stopId!]: { ok: false, list: [] } })); });
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { dead = true; clearInterval(t); };
  }, [nodes]);

  // 내 위치 추적 → 가장 가까운 노드가 '지금 여기' (시연 모드에서는 사용 안 함)
  useEffect(() => {
    if (!nodes || demo || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        let best = 0;
        let bd = Infinity;
        nodes.forEach((n, i) => {
          const d = distanceM(pos.coords.latitude, pos.coords.longitude, n.lat, n.lng);
          if (d < bd) { bd = d; best = i; }
        });
        setGpsIdx(best);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [nodes, demo]);

  if (!data || !nodes) return null;
  const cur = demo ? demoIdx : gpsIdx;
  const remMin = nodes[cur ?? 0].remMin;

  return (
    <div className="flex h-full flex-col">
      {/* 남은 시간 헤더 */}
      <div className="rounded-2xl bg-primary px-4 py-2.5 text-white">
        <p className="text-[1.2rem] font-black leading-tight">
          도착까지 약 {remMin}분 <span className="text-[0.75rem] font-normal opacity-80">(예상)</span>
        </p>
        <p className="mt-0.5 truncate text-[0.75rem] opacity-90">
          {data.origin.name} → {data.dest.name}
          {!demo && cur === null && " · 내 위치 확인 중"}
        </p>
      </div>

      {/* 시연 모드: GPS 대신 버튼으로 현재 위치 이동 */}
      {demo && (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-warn-soft px-3 py-1.5">
          <span className="flex-1 text-[0.75rem] font-bold text-warn">시연 모드 · 위치 이동</span>
          <button
            type="button"
            onClick={() => setDemoIdx((v) => Math.max(0, v - 1))}
            className="rounded-lg bg-white px-3 py-1 text-[0.8rem] font-bold ring-1 ring-line active:bg-primary-soft"
          >
            ◂ 이전
          </button>
          <button
            type="button"
            onClick={() => setDemoIdx((v) => Math.min(nodes.length - 1, v + 1))}
            className="rounded-lg bg-primary px-3 py-1 text-[0.8rem] font-bold text-white active:opacity-80"
          >
            다음 ▸
          </button>
        </div>
      )}

      {/* 진행 레일 타임라인 */}
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        <div className="relative pl-6">
          <span className="absolute bottom-5 left-[8px] top-5 w-[3px] rounded bg-line" />
          <div className="flex flex-col gap-2">
            {nodes.map((n, i) => {
              const isCur = cur === i;
              const passed = cur !== null && i < cur;
              const isStopNode = !!n.stopId;
              const a = n.stopId ? arr[n.stopId] : undefined;
              const bestBus = a?.ok ? a.list[0] : undefined;
              const busNo = bestBus ? bestBus.routeNo : n.routeNo?.split("·")[0];
              return (
                <div key={i} className="relative">
                  {/* 레일 점: 지나온 곳 = 파랑, 현재 = 펄스, 남은 곳 = 회색 */}
                  {isCur && (
                    <span
                      className="absolute -left-[21px] top-3 h-[14px] w-[14px] rounded-full"
                      style={{ background: "rgba(0,79,158,.35)", animation: "locpulse 2s ease-out infinite" }}
                    />
                  )}
                  <span
                    className={`absolute -left-[21px] top-3 h-[14px] w-[14px] rounded-full border-2 border-white shadow ${
                      isCur ? "bg-primary" : passed ? "bg-primary/60" : "bg-gray-300"
                    }`}
                  />

                  {isStopNode ? (
                    <div className={`rounded-xl border-2 bg-white p-2.5 ${isCur ? "border-primary ring-2 ring-primary/30" : "border-line"}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[0.7rem] font-black ${ROLE_STYLE[n.role]}`}>
                          {n.role}
                        </span>
                        <span className="truncate text-[0.9rem] font-bold">{n.name}</span>
                        {isCur && (
                          <span className="ml-auto shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                            지금 여기
                          </span>
                        )}
                      </div>
                      {n.routeNo && (
                        <p className="mt-1 text-[0.8rem]">
                          {busNo && <span className="rounded bg-primary px-1.5 py-0.5 font-black text-white">{busNo}번</span>}{" "}
                          {a === undefined
                            ? "도착 확인 중…"
                            : !a.ok
                              ? "도착 정보를 못 불러왔어요"
                              : bestBus
                                ? `${bestBus.minutes}분 후 도착`
                                : "지금 오는 버스 없음"}
                          {n.ride !== undefined && (
                            <span className="ml-1.5 text-[0.72rem] text-muted">· {n.ride}개 정류장 이동</span>
                          )}
                        </p>
                      )}
                      {n.fac && (
                        <div className="mt-1.5">
                          <FacilityChips fac={n.fac} compact />
                        </div>
                      )}
                      {n.shelter && (
                        <p className="mt-1 text-[0.72rem] font-bold text-[#2b8a3e]">
                          무더위쉼터 {n.shelter.name} · 직선 {formatDistance(n.shelter.dist)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className={`flex items-center gap-1.5 rounded-xl px-1.5 py-1.5 ${isCur ? "bg-primary-soft ring-2 ring-primary/40" : ""}`}>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[0.7rem] font-black ${ROLE_STYLE[n.role]}`}>
                        {n.role}
                      </span>
                      <span className="truncate text-[0.9rem] font-bold">{n.name}</span>
                      {isCur && (
                        <span className="ml-auto shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                          지금 여기
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
