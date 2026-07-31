"use client";

// 실시간 경로 플로우 (v6.3): 왼쪽 진행 레일 + 승차/환승/하차 박스 타임라인.
// - 버스는 '가장 빨리 오는 한 대'만 표시 (TAGO 실시간, 없으면 대표 번호 폴백)
// - 버스 이동 중이면 승차↔하차 박스 사이에 '지금 지나는 정류장' 박스가 실시간으로 끼어듦
//   (경유 정류장 좌표는 BusLeg.path — 내 위치와 최근접 매칭)
// - ?demo=1 : 시연 모드 — GPS 대신 버튼으로 경유 정류장 단위 이동 (데이터는 전부 실데이터)
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Arrival } from "@/lib/arrivals";
import { distanceM, formatDistance } from "@/lib/geo";
import { loadJourneyState } from "@/lib/journeyStore";
import { type BusLeg, type Journey, type Place } from "@/lib/journey";
import { buildNodes, buildPositions, type Role } from "@/lib/journeyFlow";
import { useKakaoReady } from "@/lib/useKakao";
import FacilityChips from "./FacilityChips";

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  const kakaoReady = useKakaoReady();
  const demo = params.get("demo") === "1"; // 시연 모드
  const [data, setData] = useState<{ j: Journey; origin: Place; dest: Place } | null>(null);
  const [arr, setArr] = useState<ArrState>({});
  const [gpsIdx, setGpsIdx] = useState<number | null>(null); // positions 인덱스
  const [demoIdx, setDemoIdx] = useState(0);
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const curOvRef = useRef<any>(null);

  useEffect(() => {
    const s = loadJourneyState();
    const j = s?.candidates.find((c) => c.id === s.selectedId);
    if (!s || !j) { router.replace("/"); return; }
    setData({ j, origin: s.origin, dest: s.dest });
  }, [router]);

  const nodes = useMemo(
    () => (data ? buildNodes(data.j, data.dest) : null),
    [data],
  );
  const positions = useMemo(
    () => (nodes && data ? buildPositions(nodes, data.j) : null),
    [nodes, data],
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

  // 내 위치 추적 → 노드·경유 정류장 중 가장 가까운 곳이 '지금 여기' (시연 모드에서는 사용 안 함)
  useEffect(() => {
    if (!positions || demo || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        let best = 0;
        let bd = Infinity;
        positions.forEach((p, i) => {
          const d = distanceM(pos.coords.latitude, pos.coords.longitude, p.lat, p.lng);
          if (d < bd) { bd = d; best = i; }
        });
        setGpsIdx(best);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [positions, demo]);

  // 상단 지도: 경로 폴리라인 + 정류장 점 (한 번 생성, 경로 전체가 보이게)
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    if (!kakaoReady || !nodes || !data || !mapBoxRef.current || mapRef.current) return;
    const kakao = window.kakao;
    const map = new kakao.maps.Map(mapBoxRef.current, {
      center: new kakao.maps.LatLng(nodes[0].lat, nodes[0].lng),
      level: 5,
    });
    mapRef.current = map;
    const bounds = new kakao.maps.LatLngBounds();
    for (const leg of data.j.legs) {
      if (leg.kind !== "bus") continue;
      const path = (leg as BusLeg).path.map(([la, ln]) => new kakao.maps.LatLng(la, ln));
      path.forEach((p) => bounds.extend(p));
      new kakao.maps.Polyline({ map, path, strokeWeight: 5, strokeColor: "#004f9e", strokeOpacity: 0.75 });
    }
    const dotColor: Record<string, string> = { 승차: "#004f9e", 환승: "#d9480f", 하차: "#17202b", 도착: "#2b8a3e" };
    for (const n of nodes) {
      bounds.extend(new kakao.maps.LatLng(n.lat, n.lng));
      const el = document.createElement("div");
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${dotColor[n.role] ?? "#9aa4af"};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);`;
      el.title = n.name;
      new kakao.maps.CustomOverlay({ map, position: new kakao.maps.LatLng(n.lat, n.lng), content: el, yAnchor: 0.5 });
    }
    map.setBounds(bounds);
    setMapReady(true);
  }, [kakaoReady, nodes, data]);

  // 지도 위 현재 위치 점(파랑 펄스) — 현재 노드·경유 정류장 좌표를 따라 이동
  const curIdxCalc = positions ? (demo ? Math.min(demoIdx, positions.length - 1) : gpsIdx) : null;
  useEffect(() => {
    if (!mapReady || !mapRef.current || curIdxCalc === null || !positions) return;
    const kakao = window.kakao;
    const p = positions[curIdxCalc];
    const pos = new kakao.maps.LatLng(p.lat, p.lng);
    if (!curOvRef.current) {
      const el = document.createElement("div");
      el.innerHTML =
        '<span style="position:absolute;inset:-8px;border-radius:50%;background:rgba(0,122,255,.25);animation:locpulse 2s ease-out infinite;"></span>' +
        '<span style="position:absolute;inset:0;border-radius:50%;background:#007aff;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45);"></span>';
      el.style.cssText = "position:relative;width:16px;height:16px;";
      curOvRef.current = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 0.5, zIndex: 10 });
      curOvRef.current.setMap(mapRef.current);
    } else {
      curOvRef.current.setPosition(pos);
    }
  }, [mapReady, curIdxCalc, positions]);

  if (!data || !nodes || !positions) return null;
  const curIdx = curIdxCalc;
  const cur = curIdx === null ? null : positions[curIdx];

  const curBadge = (
    <span className="ml-auto shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
      지금 여기
    </span>
  );
  const railDot = (state: "cur" | "passed" | "todo") => (
    <>
      {state === "cur" && (
        <span
          className="absolute -left-[21px] top-3 h-[14px] w-[14px] rounded-full"
          style={{ background: "rgba(0,79,158,.35)", animation: "locpulse 2s ease-out infinite" }}
        />
      )}
      <span
        className={`absolute -left-[21px] top-3 h-[14px] w-[14px] rounded-full border-2 border-white shadow ${
          state === "cur" ? "bg-primary" : state === "passed" ? "bg-primary/60" : "bg-gray-300"
        }`}
      />
    </>
  );

  return (
    <div className="flex h-full flex-col">
      {/* 상단 지도 (화면 절반) — 경로선·정류장 점·현재 위치 */}
      <div ref={mapBoxRef} className="h-[42%] w-full shrink-0 overflow-hidden rounded-2xl border border-line bg-white" />

      {/* 시연 모드: GPS 대신 버튼으로 현재 위치 이동 (경유 정류장 단위) */}
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
            onClick={() => setDemoIdx((v) => Math.min(positions.length - 1, v + 1))}
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
              const isCurNode = cur?.kind === "node" && cur.nodeIdx === i;
              const riding = cur?.kind === "riding" && cur.nodeIdx === i ? cur : null;
              const passed =
                cur !== null &&
                (cur.kind === "node" ? i < cur.nodeIdx : i <= cur.nodeIdx);
              const isStopNode = !!n.stopId;
              const a = n.stopId ? arr[n.stopId] : undefined;
              const bestBus = a?.ok ? a.list[0] : undefined;
              const busNo = bestBus ? bestBus.routeNo : n.routeNo?.split("·")[0];
              return (
                <div key={i} className="contents">
                  <div className="relative">
                    {railDot(isCurNode ? "cur" : passed ? "passed" : "todo")}
                    {isStopNode ? (
                      <div className={`rounded-xl border-2 bg-white p-2.5 ${isCurNode ? "border-primary ring-2 ring-primary/30" : "border-line"}`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[0.7rem] font-black ${ROLE_STYLE[n.role]}`}>
                            {n.role}
                          </span>
                          <span className="truncate text-[0.9rem] font-bold">{n.name}</span>
                          {isCurNode && curBadge}
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
                            무더위쉼터 {n.shelter.name} · {formatDistance(n.shelter.dist)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className={`flex items-center gap-1.5 rounded-xl px-1.5 py-1.5 ${isCurNode ? "bg-primary-soft ring-2 ring-primary/40" : ""}`}>
                        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[0.7rem] font-black ${ROLE_STYLE[n.role]}`}>
                          {n.role}
                        </span>
                        <span className="truncate text-[0.9rem] font-bold">{n.name}</span>
                        {isCurNode && curBadge}
                      </div>
                    )}
                  </div>

                  {/* 버스 이동 중 — 승차/환승 박스와 다음 박스 사이에 현재 정류장이 실시간으로 끼어듦 */}
                  {riding && (
                    <div className="relative">
                      {railDot("cur")}
                      <div className="rounded-xl border-2 border-primary bg-primary-soft p-2.5 ring-2 ring-primary/30">
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[0.7rem] font-black text-white">
                            버스 이동 중
                          </span>
                          <span className="truncate text-[0.9rem] font-bold">{riding.name}</span>
                          {curBadge}
                        </div>
                        <p className="mt-1 text-[0.78rem] text-muted">
                          <span className="font-bold text-ink">{riding.alightName}</span> 하차까지{" "}
                          <span className="font-bold text-primary">{riding.stopsLeft}개 정류장</span>
                        </p>
                      </div>
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
