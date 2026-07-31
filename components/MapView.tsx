"use client";

// 지도 (v6.2): 정류장 레이어 제거 — 무더위쉼터 전용
// 정류장은 카카오 기본 지도가 이미 그리므로 우리 핀을 겹쳐 찍지 않는다.
// 무더위쉼터 = 초록 핀(탭 → 상세 카드), 내 위치 = 블루닷(펄스)
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import sheltersRaw from "@/lib/data/shelters.json";
import type { Shelter } from "@/lib/types";
import { DEFAULT_CENTER, formatDistance, distanceM } from "@/lib/geo";
import { useKakaoReady } from "@/lib/useKakao";

const SHELTERS = (sheltersRaw as Shelter[]).filter((s) => s.operating);
// 쉼터는 226곳이 시 전역에 성기게 흩어져 있다 — 정류장 기준의 레벨 3(50m)이면 빈 화면이 된다
const FIXED_LEVEL = 6;
const DEEPLINK_MATCH_M = 50; // 정류장 상세에서 넘어온 좌표와 쉼터를 맞추는 허용 오차

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function MapView() {
  const params = useSearchParams();
  const ready = useKakaoReady();
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const myOv = useRef<any>(null);
  const myPosRef = useRef<{ lat: number; lng: number } | null>(null);

  // 딥링크(정류장 상세→근처 쉼터) 좌표 — 지도 중심이자 카드 자동 선택의 기준
  const qLat = parseFloat(params.get("lat") ?? "");
  const qLng = parseFloat(params.get("lng") ?? "");
  const hasQ = Number.isFinite(qLat) && Number.isFinite(qLng);

  // 특정 쉼터를 눌러 들어왔으면 그 카드를 첫 렌더부터 펼쳐둔다
  const [selShelter, setSelShelter] = useState<(Shelter & { dist?: number }) | null>(
    () =>
      (hasQ && SHELTERS.find((sh) => distanceM(qLat, qLng, sh.lat, sh.lng) < DEEPLINK_MATCH_M)) ||
      null,
  );

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
    // 딥링크가 있으면 그 좌표, 아니면 내 위치(폴백 명동)
    const center = hasQ ? { lat: qLat, lng: qLng } : DEFAULT_CENTER;

    const map = new kakao.maps.Map(boxRef.current, {
      center: new kakao.maps.LatLng(center.lat, center.lng),
      level: FIXED_LEVEL,
    });
    mapRef.current = map;

    // 쉼터 226곳은 고정 — 한 번만 그려두면 팬·줌을 따라다닌다 (뷰포트 재계산 불필요)
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
        setSelShelter({ ...sh, dist: my ? distanceM(my.lat, my.lng, sh.lat, sh.lng) : undefined });
      };
      // yAnchor 1 = 핀 꼬리 끝이 좌표에 닿게
      new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(sh.lat, sh.lng),
        content: el,
        yAnchor: 1,
      }).setMap(map);
    }

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

  return (
    <div className="relative h-full">
      <div ref={boxRef} className="h-full w-full" />

      {/* 레이어가 하나뿐이라 토글 대신 범례 — 끄면 빈 지도가 될 뿐이다 */}
      <div className="absolute left-3 top-3 z-10 flex items-center rounded-xl bg-white/95 px-3 py-1.5 text-[0.8rem] font-bold shadow">
        <span className="mr-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#2b8a3e] text-[0.6rem] text-white">
          쉼
        </span>
        무더위쉼터 {SHELTERS.length}곳
      </div>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg">
          <p className="text-muted">지도를 불러오는 중…</p>
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
