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
const FIXED_LEVEL = 3; // 카카오맵 레벨 3 = 축척 50m
const DEEPLINK_MATCH_M = 50; // 정류장 상세에서 넘어온 좌표와 쉼터를 맞추는 허용 오차

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

// "0900" → 540. "2400"(자정)은 1440이 되어 Date로 파싱할 때 생기는 날짜 넘김을 피한다.
function toMinutes(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2));
}

// 지금 문을 열었는지 — 운영 요일과 시각을 함께 본다.
// end <= start 면 자정을 넘겨 운영하는 곳(예: 0600~0100)이라,
// 그 새벽 시간대는 오늘이 아니라 '어제 시작한 영업분'으로 판정해야 맞다.
function isOpenNow(sh: Shelter, now: Date): boolean {
  const runsOn = (dayIndex: number) =>
    (sh.days ?? "")
      .split(",")
      .map((d) => d.trim())
      .includes(WEEKDAY[dayIndex]);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(sh.start);
  const end = toMinutes(sh.end);

  if (end > start) return runsOn(now.getDay()) && nowMin >= start && nowMin < end;
  if (nowMin >= start) return runsOn(now.getDay());
  return nowMin < end && runsOn((now.getDay() + 6) % 7);
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// 쉼터 핀: 글씨 없이 초록 핀 + 흰 원. 선택되면 색은 그대로 두고 크기만 커진다.
// 바깥 상자를 고정 크기(하단 정렬)로 두어 커질 때 위쪽으로만 자란다 — 좌표는 항상 핀 끝에 고정
function pinSvg(selected: boolean): string {
  const w = selected ? 42 : 30;
  const h = selected ? 53 : 38;
  return (
    `<svg width="${w}" height="${h}" viewBox="0 0 30 38">` +
    '<path d="M15 37C15 37 3 22.5 3 13a12 12 0 0 1 24 0c0 9.5-12 24-12 24z" fill="#2b8a3e" stroke="#fff" stroke-width="2"/>' +
    '<circle cx="15" cy="13" r="4.5" fill="#fff"/>' +
    "</svg>"
  );
}
const PIN_BOX = "width:42px;height:53px;padding:0;border:0;background:none;cursor:pointer;display:flex;align-items:flex-end;justify-content:center;";

export default function MapView() {
  const params = useSearchParams();
  const ready = useKakaoReady();
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const myOv = useRef<any>(null);
  const myPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const pinRefs = useRef<{ el: HTMLButtonElement; ov: any; sh: Shelter }[]>([]);

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
    // 쉼터 지도는 고정 화면 — 스크롤(팬)·확대축소 없이 내 위치 주변만 보여준다
    map.setDraggable(false);
    map.setZoomable(false);
    mapRef.current = map;

    // 카드 바깥(지도)을 누르면 닫힘 — 쉼터 핀은 clickable:true라 이 이벤트를 막는다
    kakao.maps.event.addListener(map, "click", () => setSelShelter(null));

    // 쉼터 226곳은 고정 — 한 번만 그려두면 팬·줌을 따라다닌다 (뷰포트 재계산 불필요)
    pinRefs.current = [];
    for (const sh of SHELTERS) {
      const el = document.createElement("button");
      el.title = sh.name;
      el.style.cssText = PIN_BOX;
      el.innerHTML = pinSvg(false);
      el.onclick = () => {
        const my = myPosRef.current;
        setSelShelter({ ...sh, dist: my ? distanceM(my.lat, my.lng, sh.lat, sh.lng) : undefined });
      };
      // yAnchor 1 = 핀 꼬리 끝이 좌표에 닿게
      // clickable = 핀 클릭이 지도 click(카드 닫기)까지 전달되지 않게 막는다
      const ov = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(sh.lat, sh.lng),
        content: el,
        yAnchor: 1,
        clickable: true,
      });
      ov.setMap(map);
      pinRefs.current.push({ el, ov, sh });
    }

    // 진입하자마자 가장 가까운 쉼터 카드를 펼친다 (딥링크 선택이 없을 때만)
    const selectNearest = (lat: number, lng: number, withDist: boolean) => {
      let best: Shelter | null = null;
      let bd = Infinity;
      for (const sh of SHELTERS) {
        const d = distanceM(lat, lng, sh.lat, sh.lng);
        if (d < bd) { bd = d; best = sh; }
      }
      if (best) setSelShelter((prev) => prev ?? { ...best!, dist: withDist ? bd : undefined });
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          myPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          renderMyLocation(pos.coords.latitude, pos.coords.longitude);
          if (!hasQ) {
            map.setCenter(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
            map.setLevel(FIXED_LEVEL);
            selectNearest(pos.coords.latitude, pos.coords.longitude, true);
          }
        },
        () => { if (!hasQ) selectNearest(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, false); },
        { timeout: 5000 },
      );
    } else if (!hasQ) {
      selectNearest(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // 선택된 쉼터 핀을 크고 진하게 — 다른 핀과 구분
  useEffect(() => {
    for (const p of pinRefs.current) {
      const isSel =
        !!selShelter && p.sh.lat === selShelter.lat && p.sh.lng === selShelter.lng && p.sh.name === selShelter.name;
      p.el.innerHTML = pinSvg(isSel); // 상자 크기는 고정 — 핀만 위로 커진다
      p.el.style.zIndex = isSel ? "8" : "1";
      p.ov.setZIndex(isSel ? 8 : 1);
    }
  }, [selShelter]);

  const openNow = selShelter ? isOpenNow(selShelter, new Date()) : null;

  return (
    <div className="relative h-full">
      <div ref={boxRef} className="h-full w-full" />

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
            {openNow !== null && (
              <p
                className={`mt-1.5 text-[0.9rem] font-bold ${openNow ? "text-[#2b8a3e]" : "text-warn"}`}
              >
                {openNow ? "운영 중" : "운영 종료"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
