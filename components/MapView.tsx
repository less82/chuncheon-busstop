"use client";

// 지도 (v6): 자체 정류장 마커 제거 — 카카오맵 기본 지도에 그려진 정류장 표시를 그대로 사용
// 무더위쉼터 = 초록 핀 마커(기본 표시), 내 위치 = 블루닷(펄스), 축척 50m(레벨 3) 시작
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import sheltersRaw from "@/lib/data/shelters.json";
import type { Shelter } from "@/lib/types";
import { DEFAULT_CENTER, formatDistance, distanceM } from "@/lib/geo";
import { useKakaoReady } from "@/lib/useKakao";

const SHELTERS = (sheltersRaw as Shelter[]).filter((s) => s.operating);
const FIXED_LEVEL = 3; // 카카오맵 레벨 3 = 축척 50m (v5 지시)

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function MapView() {
  const params = useSearchParams();
  const ready = useKakaoReady();
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const shelterOvs = useRef<any[]>([]);
  const myOv = useRef<any>(null);
  const myPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const [showShelters, setShowShelters] = useState(true);
  const showSheltersRef = useRef(true);
  const [selected, setSelected] = useState<(Shelter & { dist?: number }) | null>(null);

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
        setSelected({ ...sh, dist: my ? distanceM(my.lat, my.lng, sh.lat, sh.lng) : undefined });
      };
      // yAnchor 1 = 핀 꼬리 끝이 좌표에 닿게
      const ov = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(sh.lat, sh.lng), content: el, yAnchor: 1 });
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
    showSheltersRef.current = showShelters;
    renderShelters();
    if (!showShelters) setSelected(null);
  }, [showShelters, renderShelters]);

  return (
    <div className="relative h-full">
      <div ref={boxRef} className="h-full w-full" />

      {/* 레이어 토글 — 정류장은 카카오 기본지도 표시를 사용하므로 쉼터만 */}
      <div className="absolute left-3 top-3 z-10">
        <button
          type="button"
          onClick={() => setShowShelters((v) => !v)}
          className={`rounded-xl px-3 py-1.5 text-[0.8rem] font-bold shadow ${showShelters ? "bg-[#2b8a3e] text-white" : "bg-white text-muted"}`}
        >
          무더위쉼터
        </button>
      </div>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg">
          <p className="text-muted">지도를 불러오는 중…</p>
        </div>
      )}

      {selected && (
        <div className="absolute inset-x-3 bottom-3 z-20">
          <div className="rounded-2xl border border-line bg-white p-4 shadow-lg">
            <div className="flex items-baseline justify-between">
              <p className="font-bold">
                <span className="mr-1.5 rounded-md bg-[#2b8a3e] px-1.5 py-0.5 text-[0.7rem] text-white">쉼터</span>
                {selected.name}
              </p>
              {selected.dist !== undefined && (
                <p className="text-[0.85rem] font-bold text-[#2b8a3e]">{formatDistance(selected.dist)}</p>
              )}
            </div>
            {(selected.kind || selected.addr) && (
              <p className="mt-1.5 text-[0.8rem] text-muted">
                {[selected.kind, selected.addr].filter(Boolean).join(" · ")}
              </p>
            )}
            {selected.days && <p className="mt-0.5 text-[0.75rem] text-muted">운영: {selected.days}</p>}
          </div>
          <button type="button" onClick={() => setSelected(null)} className="mx-auto mt-1.5 block rounded-lg bg-white/95 px-3 py-1 text-[0.75rem] font-bold text-muted shadow">
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
