"use client";

// 지도 (v5): 경로 표시 없음 — 정류장·쉼터 레이어 전용
// 내 위치 중심 + 축척 50m(레벨 3) 시작, 내 위치 = 블루닷(펄스)
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import slimStops from "@/lib/data/stops.slim.json";
import sheltersRaw from "@/lib/data/shelters.json";
import type { SlimStop, Shelter } from "@/lib/types";
import { DEFAULT_CENTER, formatDistance, distanceM } from "@/lib/geo";
import { useKakaoReady } from "@/lib/useKakao";
import FacilityChips from "./FacilityChips";

const ALL = slimStops as SlimStop[];
const SHELTERS = (sheltersRaw as Shelter[]).filter((s) => s.operating);
const FIXED_LEVEL = 3; // 카카오맵 레벨 3 = 축척 50m (v5 지시)

/* eslint-disable @typescript-eslint/no-explicit-any */

function markerColor(s: SlimStop): string {
  let y = 0, known = 0;
  for (const c of s.fac) {
    if (c === "y") { y++; known++; }
    else if (c === "n") known++;
  }
  if (y >= 3) return "#004f9e";
  if (known === 0) return "#9aa4af";
  return "#d9480f";
}

export default function MapView() {
  const params = useSearchParams();
  const ready = useKakaoReady();
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const stopOvs = useRef<any[]>([]);
  const shelterOvs = useRef<any[]>([]);
  const myOv = useRef<any>(null);
  const myPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const [showStops, setShowStops] = useState(true);
  const [showShelters, setShowShelters] = useState(false);
  const showStopsRef = useRef(true);
  const showSheltersRef = useRef(false);
  const [zoomedOut, setZoomedOut] = useState(false);
  const [selected, setSelected] = useState<(SlimStop & { dist?: number }) | null>(null);

  const renderStops = useCallback(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!map) return;
    for (const o of stopOvs.current) o.setMap(null);
    stopOvs.current = [];
    if (!showStopsRef.current) { setZoomedOut(false); return; }
    if (map.getLevel() > 6) { setZoomedOut(true); return; }
    setZoomedOut(false);

    const b = map.getBounds();
    const sw = b.getSouthWest(), ne = b.getNorthEast();
    const visible = ALL.filter(
      (s) => s.lat >= sw.getLat() && s.lat <= ne.getLat() && s.lng >= sw.getLng() && s.lng <= ne.getLng(),
    ).slice(0, 400);

    for (const s of visible) {
      const el = document.createElement("button");
      el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${markerColor(s)};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer;`;
      el.onclick = () => {
        const my = myPosRef.current;
        setSelected({ ...s, dist: my ? distanceM(my.lat, my.lng, s.lat, s.lng) : undefined });
      };
      const ov = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(s.lat, s.lng), content: el, yAnchor: 0.5 });
      ov.setMap(map);
      stopOvs.current.push(ov);
    }
  }, []);

  const renderShelters = useCallback(() => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!map) return;
    for (const o of shelterOvs.current) o.setMap(null);
    shelterOvs.current = [];
    if (!showSheltersRef.current) return;
    for (const sh of SHELTERS) {
      const el = document.createElement("div");
      el.textContent = "쉼";
      el.title = sh.name;
      el.style.cssText =
        "width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#fff;border:3px solid #2b8a3e;color:#2b8a3e;font-size:13px;font-weight:900;box-shadow:0 1px 5px rgba(0,0,0,.35);";
      const ov = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(sh.lat, sh.lng), content: el, yAnchor: 0.5 });
      ov.setMap(map);
      shelterOvs.current.push(ov);
    }
  }, []);

  const renderMyLocation = useCallback((lat: number, lng: number) => {
    const kakao = window.kakao;
    const map = mapRef.current;
    if (!map) return;
    if (myOv.current) myOv.current.setMap(null);
    const el = document.createElement("div");
    el.innerHTML =
      '<span style="position:absolute;inset:-9px;border-radius:50%;background:rgba(0,122,255,.25);animation:locpulse 2s ease-out infinite;"></span>' +
      '<span style="position:absolute;inset:0;border-radius:50%;background:#007aff;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45);"></span>';
    el.style.cssText = "position:relative;width:18px;height:18px;";
    myOv.current = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(lat, lng), content: el, yAnchor: 0.5, zIndex: 10 });
    myOv.current.setMap(map);
  }, []);

  useEffect(() => {
    if (!ready || mapRef.current || !boxRef.current) return;
    const kakao = window.kakao;
    // 딥링크(정류장 상세→근처 쉼터)가 있으면 그 좌표, 아니면 내 위치(폴백 명동)
    const qLat = parseFloat(params.get("lat") ?? "");
    const qLng = parseFloat(params.get("lng") ?? "");
    const hasQ = Number.isFinite(qLat) && Number.isFinite(qLng);
    const center = hasQ ? { lat: qLat, lng: qLng } : DEFAULT_CENTER;

    const map = new kakao.maps.Map(boxRef.current, {
      center: new kakao.maps.LatLng(center.lat, center.lng),
      level: FIXED_LEVEL,
    });
    mapRef.current = map;
    kakao.maps.event.addListener(map, "idle", renderStops);
    renderStops();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          myPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          renderMyLocation(pos.coords.latitude, pos.coords.longitude);
          if (!hasQ) {
            map.setCenter(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
            map.setLevel(FIXED_LEVEL);
          }
        },
        () => {},
        { timeout: 5000 },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    showStopsRef.current = showStops;
    renderStops();
  }, [showStops, renderStops]);
  useEffect(() => {
    showSheltersRef.current = showShelters;
    renderShelters();
  }, [showShelters, renderShelters]);

  return (
    <div className="relative h-full">
      <div ref={boxRef} className="h-full w-full" />

      {/* 레이어 토글 (v5: 뒤로·홈 제거) */}
      <div className="absolute left-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={() => setShowStops((v) => !v)}
          className={`rounded-xl px-3 py-1.5 text-[0.8rem] font-bold shadow ${showStops ? "bg-primary text-white" : "bg-white text-muted"}`}
        >
          정류장
        </button>
        <button
          type="button"
          onClick={() => setShowShelters((v) => !v)}
          className={`rounded-xl px-3 py-1.5 text-[0.8rem] font-bold shadow ${showShelters ? "bg-[#2b8a3e] text-white" : "bg-white text-muted"}`}
        >
          무더위쉼터
        </button>
      </div>

      {showStops && (
        <div className="absolute right-3 top-3 z-10 rounded-xl bg-white/95 px-3 py-2 text-[0.7rem] shadow">
          <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-primary" />시설 양호</p>
          <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-warn" />시설 부족</p>
          <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-gray-400" />미확인</p>
        </div>
      )}

      {zoomedOut && showStops && (
        <p className="absolute left-1/2 top-16 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl bg-white/95 px-4 py-2 text-[0.85rem] font-bold text-muted shadow">
          지도를 확대하면 정류장이 보여요
        </p>
      )}

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg">
          <p className="text-muted">지도를 불러오는 중…</p>
        </div>
      )}

      {selected && (
        <div className="absolute inset-x-3 bottom-3 z-20">
          <Link href={`/stops/${selected.id}`} className="block rounded-2xl border border-line bg-white p-4 shadow-lg">
            <div className="flex items-baseline justify-between">
              <p className="font-bold">
                {selected.name}
                {selected.no && <span className="ml-1 text-[0.75rem] font-normal text-muted">({selected.no})</span>}
              </p>
              {selected.dist !== undefined && (
                <p className="text-[0.85rem] font-bold text-primary">{formatDistance(selected.dist)}</p>
              )}
            </div>
            <div className="mt-2"><FacilityChips fac={selected.fac} /></div>
            <p className="mt-2 text-[0.8rem] font-bold text-primary">자세히 보기 →</p>
          </Link>
          <button type="button" onClick={() => setSelected(null)} className="mx-auto mt-1.5 block rounded-lg bg-white/95 px-3 py-1 text-[0.75rem] font-bold text-muted shadow">
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
