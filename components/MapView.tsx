"use client";

// 지도 (v6.1): 정류장 = 파란 핀 마커(탭 → 시설 카드), 무더위쉼터 = 초록 핀 마커
// 내 위치 = 블루닷(펄스), 축척 50m(레벨 3) 시작
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
  const showStopsRef = useRef(true);
  const [showShelters, setShowShelters] = useState(true);
  const showSheltersRef = useRef(true);
  const [zoomedOut, setZoomedOut] = useState(false);
  const [selStop, setSelStop] = useState<(SlimStop & { dist?: number }) | null>(null);
  const [selShelter, setSelShelter] = useState<(Shelter & { dist?: number }) | null>(null);

  // 정류장 = 파란 핀 (뷰포트 내 최대 400개, 레벨>6은 숨김)
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
      el.title = s.name;
      el.style.cssText = "width:24px;height:30px;padding:0;border:0;background:none;cursor:pointer;";
      el.innerHTML =
        '<svg width="24" height="30" viewBox="0 0 24 30">' +
        '<path d="M12 29C12 29 2.5 17.8 2.5 10.5a9.5 9.5 0 0 1 19 0C21.5 17.8 12 29 12 29z" fill="#004f9e" stroke="#fff" stroke-width="1.8"/>' +
        '<circle cx="12" cy="10.5" r="3.4" fill="#fff"/>' +
        "</svg>";
      el.onclick = () => {
        const my = myPosRef.current;
        setSelShelter(null);
        setSelStop({ ...s, dist: my ? distanceM(my.lat, my.lng, s.lat, s.lng) : undefined });
      };
      const ov = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(s.lat, s.lng), content: el, yAnchor: 1 });
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
      const el = document.createElement("button");
      el.title = sh.name;
      el.style.cssText = "width:30px;height:38px;padding:0;border:0;background:none;cursor:pointer;";
      el.innerHTML =
        '<svg width="30" height="38" viewBox="0 0 30 38">' +
        '<path d="M15 37C15 37 3 22.5 3 13a12 12 0 0 1 24 0c0 9.5-12 24-12 24z" fill="#2b8a3e" stroke="#fff" stroke-width="2"/>' +
        '<text x="15" y="17.5" text-anchor="middle" fill="#fff" font-size="10.5" font-weight="900">쉼</text>' +
        "</svg>";
      el.onclick = () => {
        const my = myPosRef.current;
        setSelStop(null);
        setSelShelter({ ...sh, dist: my ? distanceM(my.lat, my.lng, sh.lat, sh.lng) : undefined });
      };
      // yAnchor 1 = 핀 꼬리 끝이 좌표에 닿게, 쉼터 핀이 정류장 핀 위에 오게
      const ov = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(sh.lat, sh.lng), content: el, yAnchor: 1, zIndex: 5 });
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
    renderShelters();

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
    if (!showStops) setSelStop(null);
  }, [showStops, renderStops]);
  useEffect(() => {
    showSheltersRef.current = showShelters;
    renderShelters();
    if (!showShelters) setSelShelter(null);
  }, [showShelters, renderShelters]);

  return (
    <div className="relative h-full">
      <div ref={boxRef} className="h-full w-full" />

      {/* 레이어 토글: 정류장(파란 핀) · 무더위쉼터(초록 핀) */}
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

      {selStop && (
        <div className="absolute inset-x-3 bottom-3 z-20">
          <Link href={`/stops/${selStop.id}`} className="block rounded-2xl border border-line bg-white p-4 shadow-lg">
            <div className="flex items-baseline justify-between">
              <p className="font-bold">
                {selStop.name}
                {selStop.no && <span className="ml-1 text-[0.75rem] font-normal text-muted">({selStop.no})</span>}
              </p>
              {selStop.dist !== undefined && (
                <p className="text-[0.85rem] font-bold text-primary">{formatDistance(selStop.dist)}</p>
              )}
            </div>
            <div className="mt-2"><FacilityChips fac={selStop.fac} /></div>
            <p className="mt-2 text-[0.8rem] font-bold text-primary">자세히 보기 →</p>
          </Link>
          <button type="button" onClick={() => setSelStop(null)} className="mx-auto mt-1.5 block rounded-lg bg-white/95 px-3 py-1 text-[0.75rem] font-bold text-muted shadow">
            닫기
          </button>
        </div>
      )}

      {selShelter && (
        <div className="absolute inset-x-3 bottom-3 z-20">
          <div className="rounded-2xl border border-line bg-white p-4 shadow-lg">
            <div className="flex items-baseline justify-between">
              <p className="font-bold">
                <span className="mr-1.5 rounded-md bg-[#2b8a3e] px-1.5 py-0.5 text-[0.7rem] text-white">쉼터</span>
                {selShelter.name}
              </p>
              {selShelter.dist !== undefined && (
                <p className="text-[0.85rem] font-bold text-[#2b8a3e]">{formatDistance(selShelter.dist)}</p>
              )}
            </div>
            {(selShelter.kind || selShelter.addr) && (
              <p className="mt-1.5 text-[0.8rem] text-muted">
                {[selShelter.kind, selShelter.addr].filter(Boolean).join(" · ")}
              </p>
            )}
            {selShelter.days && <p className="mt-0.5 text-[0.75rem] text-muted">운영: {selShelter.days}</p>}
          </div>
          <button type="button" onClick={() => setSelShelter(null)} className="mx-auto mt-1.5 block rounded-lg bg-white/95 px-3 py-1 text-[0.75rem] font-bold text-muted shadow">
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
