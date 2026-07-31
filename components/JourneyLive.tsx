"use client";

// 실시간 경로 플로우 (v6): 선택한 경로를 출발지 → (환승) → 도착지 세로 타임라인으로.
// 정류장마다 버스 도착정보(TAGO) + 시설 5종 + 가장 가까운 무더위쉼터(직선거리).
// 내 위치(GPS watch)로 현재 노드를 강조하고 도착까지 남은 시간을 표시. 한 화면 구성.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  routeNo?: string; // 이 정류장에서 확인할 버스 번호(병합 표기)
  waitMin: number; // 이 노드에서의 대기 가정
  outMin: number; // 다음 노드까지 이동 시간
  outNote?: string; // 다음 노드까지 이동 설명
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

function stopNode(role: Role, stopId: string, fallbackName: string, routeNo?: string, waitMin = 0): FlowNode {
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
    waitMin,
    outMin: 0,
    shelter: s ? nearestShelter(lat, lng) : undefined,
    remMin: 0,
  };
}

// 경로 → 타임라인 노드. 남은 시간은 도착지부터 역방향 누적(대기 포함)
function buildNodes(j: Journey, origin: Place, dest: Place): FlowNode[] {
  const nodes: FlowNode[] = [
    { role: "출발", name: origin.name, lat: origin.lat, lng: origin.lng, waitMin: 0, outMin: 0, remMin: 0 },
  ];
  let pendingWalk = 0; // 다음 노드 직전까지의 도보(분)
  let prevBus: BusLeg | null = null;

  for (const leg of j.legs) {
    if (leg.kind === "walk") { pendingWalk += leg.minutes; continue; }
    const prev = nodes[nodes.length - 1];
    if (prevBus === null) {
      prev.outMin = pendingWalk;
      prev.outNote = `걷기 ${pendingWalk}분`;
    } else {
      prev.outMin = prevBus.rideStops * PER_STOP + pendingWalk;
      prev.outNote = `버스 ${prevBus.rideStops}개 정류장` + (pendingWalk ? ` → 건너편 걷기 ${pendingWalk}분` : "");
    }
    nodes.push(
      stopNode(prevBus === null ? "승차" : "환승", leg.boardId, leg.boardName, leg.routeNo,
        prevBus === null ? FIRST_WAIT : TRANSFER_WAIT),
    );
    prevBus = leg;
    pendingWalk = 0;
  }

  if (prevBus) {
    const prev = nodes[nodes.length - 1];
    prev.outMin = prevBus.rideStops * PER_STOP;
    prev.outNote = `버스 ${prevBus.rideStops}개 정류장`;
    nodes.push(stopNode("하차", prevBus.alightId, prevBus.alightName, prevBus.routeNo));
    const alight = nodes[nodes.length - 1];
    alight.outMin = pendingWalk;
    alight.outNote = `걷기 ${pendingWalk}분`;
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
  const [data, setData] = useState<{ j: Journey; origin: Place; dest: Place } | null>(null);
  const [arr, setArr] = useState<ArrState>({});
  const [curIdx, setCurIdx] = useState<number | null>(null);

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

  // 승차·환승·하차 정류장 도착정보 (30초 갱신) — 목업 없음, 실패는 실패로 표시
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
            const list = (d.arrivals as Arrival[]).filter((a) => routes.includes(a.routeNo)).slice(0, 2);
            setArr((p) => ({ ...p, [n.stopId!]: { ok: true, list } }));
          })
          .catch(() => { if (!dead) setArr((p) => ({ ...p, [n.stopId!]: { ok: false, list: [] } })); });
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { dead = true; clearInterval(t); };
  }, [nodes]);

  // 내 위치 추적 → 가장 가까운 노드가 '지금 여기'
  useEffect(() => {
    if (!nodes || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        let best = 0;
        let bd = Infinity;
        nodes.forEach((n, i) => {
          const d = distanceM(pos.coords.latitude, pos.coords.longitude, n.lat, n.lng);
          if (d < bd) { bd = d; best = i; }
        });
        setCurIdx(best);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [nodes]);

  if (!data || !nodes) return null;
  const remMin = nodes[curIdx ?? 0].remMin;

  return (
    <div className="flex h-full flex-col">
      {/* 남은 시간 헤더 */}
      <div className="rounded-2xl bg-primary px-4 py-2.5 text-white">
        <p className="text-[1.2rem] font-black leading-tight">
          도착까지 약 {remMin}분 <span className="text-[0.75rem] font-normal opacity-80">(예상)</span>
        </p>
        <p className="mt-0.5 truncate text-[0.75rem] opacity-90">
          {data.origin.name} → {data.dest.name}
          {curIdx === null && " · 내 위치 확인 중"}
        </p>
      </div>

      {/* 세로 타임라인 */}
      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        {nodes.map((n, i) => {
          const isCur = curIdx === i;
          const a = n.stopId ? arr[n.stopId] : undefined;
          return (
            <div key={i} className="flex min-h-0 flex-col">
              <div className={`rounded-xl px-2.5 py-1.5 ${isCur ? "bg-primary-soft ring-2 ring-primary" : ""}`}>
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
                {n.routeNo && n.role !== "하차" && (
                  <p className="mt-1 text-[0.78rem]">
                    <span className="rounded bg-primary px-1.5 py-0.5 font-black text-white">{n.routeNo}번</span>{" "}
                    {a === undefined
                      ? "도착 확인 중…"
                      : !a.ok
                        ? "도착 정보를 못 불러왔어요"
                        : a.list.length === 0
                          ? "지금 오는 버스 없음"
                          : a.list.map((x) => `${x.minutes}분`).join(" · ") + " 후 도착"}
                  </p>
                )}
                {n.fac && (
                  <div className="mt-1">
                    <FacilityChips fac={n.fac} compact />
                  </div>
                )}
                {n.shelter && (
                  <p className="mt-1 text-[0.72rem] font-bold text-[#2b8a3e]">
                    무더위쉼터 {n.shelter.name} · 직선 {formatDistance(n.shelter.dist)}
                  </p>
                )}
              </div>
              {n.outNote && (
                <p className="ml-5 border-l-[3px] border-line py-1 pl-3 text-[0.72rem] text-muted">
                  {n.outNote}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
