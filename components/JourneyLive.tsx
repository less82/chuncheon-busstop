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

// 역할 = 흰 배경 배지(글자만 색), 버스 번호 = 배경 없이 키컬러 텍스트
const ROLE_STYLE: Record<Role, string> = {
  출발: "text-muted",
  승차: "text-primary",
  환승: "text-warn",
  하차: "text-ink",
  도착: "text-[#2b8a3e]",
};
const roleBadge = (role: Role) => (
  <span className={`shrink-0 rounded-md bg-white px-2 py-0.5 text-[0.75rem] font-black ring-1 ring-line ${ROLE_STYLE[role]}`}>
    {role}
  </span>
);

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
  const [focusNode, setFocusNode] = useState<number | null>(null); // 탭한 정류장 — 지도가 그곳을 비춘다
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

  // 상단 지도: 정류장 점 + 쉼터 핀 (노선 선 없음). 축척 50m(레벨 3) 고정
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    if (!kakaoReady || !nodes || !data || !mapBoxRef.current || mapRef.current) return;
    const kakao = window.kakao;
    const map = new kakao.maps.Map(mapBoxRef.current, {
      center: new kakao.maps.LatLng(nodes[0].lat, nodes[0].lng),
      level: 3, // 축척 50m — 지도 탭과 동일 기준
    });
    mapRef.current = map;
    // 추천된 무더위쉼터(각 정류장 50m 이내)를 초록 핀으로 — 타임라인에 뜬 곳과 같은 곳
    const seen = new Set<string>();
    for (const n of nodes) {
      const sh = n.shelter;
      if (!sh || seen.has(sh.name)) continue;
      seen.add(sh.name);
      const el = document.createElement("div");
      el.title = sh.name;
      el.style.cssText = "width:26px;height:33px;";
      el.innerHTML =
        '<svg width="26" height="33" viewBox="0 0 30 38">' +
        '<path d="M15 37C15 37 3 22.5 3 13a12 12 0 0 1 24 0c0 9.5-12 24-12 24z" fill="#2b8a3e" stroke="#fff" stroke-width="2"/>' +
        '<circle cx="15" cy="13" r="4.5" fill="#fff"/>' +
        "</svg>";
      new kakao.maps.CustomOverlay({ map, position: new kakao.maps.LatLng(sh.lat, sh.lng), content: el, yAnchor: 1, zIndex: 4 });
    }

    const dotColor: Record<string, string> = { 승차: "#004f9e", 환승: "#d9480f", 하차: "#17202b", 도착: "#17202b" };
    let departMarked = false;
    for (const n of nodes) {
      const el = document.createElement("div");
      if (n.role === "도착") {
        // 도착 = 검은 쉼표 핀 (서비스 상징) — 정체를 알 수 없는 검은 점 대신
        el.style.cssText = "width:34px;height:42px;";
        el.innerHTML =
          '<svg width="34" height="42" viewBox="0 0 34 42">' +
          '<path d="M17 41C17 41 4 25 4 14.5a13 13 0 0 1 26 0C30 25 17 41 17 41z" fill="#17202b" stroke="#fff" stroke-width="2"/>' +
          '<path d="M19.6 10.2c1.9 0 3.3 1.4 3.3 3.4 0 2.6-2 4.9-5 6.1l-.8-1.3c1.6-.8 2.6-1.8 3-2.8-.2 .1-.5 .1-.8 .1-1.8 0-3-1.2-3-2.8 0-1.6 1.4-2.7 3.3-2.7z" fill="#fff"/>' +
          "</svg>";
        el.title = n.name;
        new kakao.maps.CustomOverlay({ map, position: new kakao.maps.LatLng(n.lat, n.lng), content: el, yAnchor: 1, zIndex: 6 });
        continue;
      }
      if (n.role === "승차" && !departMarked) {
        // 출발(첫 승차) 정류장 = 빨간 핀 마커
        departMarked = true;
        el.style.cssText = "width:34px;height:42px;";
        el.innerHTML =
          '<svg width="34" height="42" viewBox="0 0 34 42">' +
          '<path d="M17 41C17 41 4 25 4 14.5a13 13 0 0 1 26 0C30 25 17 41 17 41z" fill="#d62626" stroke="#fff" stroke-width="2"/>' +
          '<text x="17" y="18.5" text-anchor="middle" fill="#fff" font-size="9" font-weight="900">출발</text>' +
          "</svg>";
        el.title = n.name;
        new kakao.maps.CustomOverlay({ map, position: new kakao.maps.LatLng(n.lat, n.lng), content: el, yAnchor: 1, zIndex: 6 });
        continue;
      }
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${dotColor[n.role] ?? "#9aa4af"};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);`;
      el.title = n.name;
      new kakao.maps.CustomOverlay({ map, position: new kakao.maps.LatLng(n.lat, n.lng), content: el, yAnchor: 0.5 });
    }
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
    // 정류장을 탭해 보고 있는 중이면 지도를 뺏지 않는다
    if (focusNode === null) {
      mapRef.current.setCenter(pos);
      mapRef.current.setLevel(3);
    }
  }, [mapReady, curIdxCalc, positions, focusNode]);

  // 탭한 정류장으로 지도 이동 (다시 탭하면 내 위치로 복귀)
  useEffect(() => {
    if (!mapReady || !mapRef.current || focusNode === null || !nodes) return;
    const n = nodes[focusNode];
    mapRef.current.setCenter(new window.kakao.maps.LatLng(n.lat, n.lng));
    mapRef.current.setLevel(3);
  }, [mapReady, focusNode, nodes]);

  if (!data || !nodes || !positions) return null;
  const curIdx = curIdxCalc;
  const cur = curIdx === null ? null : positions[curIdx];

  return (
    <div className="flex h-full flex-col">
      {/* 상단 지도 (화면 절반) — 경로선·정류장 점·현재 위치 */}
      <div ref={mapBoxRef} className="h-[30%] w-full shrink-0 overflow-hidden rounded-2xl border border-line bg-white" />

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

      {/* 타임라인 (레일·점 없음 — 현재 위치는 카드 강조로만 표시, 한 화면에 담기게 압축) */}
      <div className="no-scrollbar mt-2 min-h-0 flex-1 overflow-hidden">
        <div>
          <div className="flex flex-col gap-1.5">
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
                  <div>
                    {/* 모든 지점을 같은 카드 형태로 — 흐름이 카드→연결문구→카드로 읽힌다 */}
                    <div
                      onClick={() => setFocusNode((v) => (v === i ? null : i))}
                      // 배경은 항상 흰색 — 상태는 파란 테두리 세기로만 구분
                      // (현재 위치 = 파란 테두리, 탭해서 보는 중 = 파란 테두리 + 링)
                      className={`rounded-2xl border-2 bg-white px-3 py-2 ${
                        focusNode === i
                          ? "border-primary ring-2 ring-primary/35"
                          : isCurNode
                            ? "border-primary"
                            : `border-line ${passed ? "opacity-60" : ""}`
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {roleBadge(n.role)}
                        <span className="truncate text-[0.95rem] font-bold">{n.name}</span>
                      </div>
                      {n.routeNo && (
                        <p className="mt-1.5 text-[0.8rem]">
                          {busNo && <span className="text-[1rem] font-black text-primary">{busNo}번</span>}{" "}
                          {a === undefined
                            ? "도착 확인 중…"
                            : !a.ok
                              ? "도착 정보를 못 불러왔어요"
                              : bestBus
                                ? `${bestBus.minutes}분 후 도착`
                                : "지금 오는 버스 없음"}
                        </p>
                      )}
                      {n.fac && (
                        <div className="mt-1.5">
                          <FacilityChips fac={n.fac} oneLine />
                        </div>
                      )}
                      {n.shelter && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-[0.75rem] font-bold text-[#2b8a3e]">
                          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#2b8a3e]" />
                          <span className="truncate">
                            무더위쉼터 {n.shelter.name} · {formatDistance(n.shelter.dist)}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* 흐름 연결: 카드 사이를 세로선 + 문구로 잇는다 */}
                    {(n.ride !== undefined || n.role === "하차") && (
                      <div className="flex items-center gap-2 pl-5">
                        <span className="h-6 w-[2px] shrink-0 rounded bg-line" />
                        <span className="py-0.5 text-[0.75rem] font-bold text-muted">
                          {n.ride !== undefined ? `버스 타고 ${n.ride}개 정류장` : "내려서 걸어가기"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 버스 이동 중 — 승차/환승 박스와 다음 박스 사이에 현재 정류장이 실시간으로 끼어듦 */}
                  {riding && (
                    <div>
                      <div className="rounded-2xl border-2 border-primary bg-white px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[0.75rem] font-black text-primary ring-1 ring-line">
                            버스 안
                          </span>
                          <span className="truncate text-[0.95rem] font-bold">{riding.name}</span>
                        </div>
                        <p className="mt-1.5 text-[0.78rem] text-muted">
                          <span className="font-bold text-ink">{riding.alightName}</span> 하차까지{" "}
                          <span className="font-bold text-primary">{riding.stopsLeft}개 정류장</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pl-5">
                        <span className="h-6 w-[2px] shrink-0 rounded bg-line" />
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
