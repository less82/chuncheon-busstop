"use client";

// 가는 길 찾기 — 입력 전용 (v5): 출발·도착 장소만 받고 [확인] → /route/results
// 출발 기본값 = 내 위치를 역지오코딩한 실제 주소 (v5: "내 위치" 문구 대신 주소)
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Place } from "@/lib/journey";
import { loadJourneyState, saveJourneyState } from "@/lib/journeyStore";
import { useKakaoReady } from "@/lib/useKakao";
import PlaceSearch from "./PlaceSearch";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Picking = "origin" | "dest" | null;

export default function JourneyFinder() {
  const router = useRouter();
  const kakaoReady = useKakaoReady();
  const [origin, setOrigin] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [myCoord, setMyCoord] = useState<{ lat: number; lng: number } | null>(null);

  // 이전 검색 복원 (홈 스택 상태 유지)
  useEffect(() => {
    const s = loadJourneyState();
    if (s) {
      setOrigin(s.origin);
      setDest(s.dest);
    }
  }, []);

  // 내 위치 좌표 확보 (이전 상태 없을 때만 출발 기본값에 사용)
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyCoord({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 },
    );
  }, []);

  // 좌표 → 주소 (카카오 Geocoder). 주소를 얻어야만 출발 기본값을 채운다
  useEffect(() => {
    if (!kakaoReady || !myCoord || origin) return;
    try {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(myCoord.lng, myCoord.lat, (res: any[], status: string) => {
        if (status !== window.kakao.maps.services.Status.OK || !res[0]) return;
        const a = res[0];
        const name = a.road_address?.address_name || a.address?.address_name;
        if (name) setOrigin((cur) => cur ?? { name, lat: myCoord.lat, lng: myCoord.lng });
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kakaoReady, myCoord]);

  const confirm = () => {
    if (!origin || !dest) return;
    saveJourneyState({ origin, dest, candidates: [], selectedId: null });
    router.push("/route/results");
  };

  return (
    <div className="mt-5 flex flex-col gap-3">
      {picking === "origin" ? (
        <PlaceSearch label="출발" onPick={(p) => { setOrigin(p); setPicking(null); }} />
      ) : (
        <button
          type="button"
          onClick={() => setPicking("origin")}
          className="rounded-2xl border-2 border-line bg-white p-4 text-left active:bg-primary-soft"
        >
          <p className="text-[0.8rem] font-bold text-muted">출발</p>
          <p className="mt-0.5 text-[1.05rem] font-bold">
            {origin ? origin.name : <span className="text-muted">주소를 찾는 중…</span>}
            <span className="ml-2 text-[0.85rem] font-bold text-primary">변경</span>
          </p>
        </button>
      )}

      {picking === "dest" ? (
        <PlaceSearch label="도착" onPick={(p) => { setDest(p); setPicking(null); }} />
      ) : (
        <button
          type="button"
          onClick={() => setPicking("dest")}
          className="rounded-2xl border-2 border-line bg-white p-4 text-left active:bg-primary-soft"
        >
          <p className="text-[0.8rem] font-bold text-muted">도착</p>
          <p className="mt-0.5 text-[1.05rem] font-bold">
            {dest ? dest.name : <span className="text-muted">어디로 가세요?</span>}
            {dest && <span className="ml-2 text-[0.85rem] font-bold text-primary">변경</span>}
          </p>
        </button>
      )}

      <button
        type="button"
        onClick={confirm}
        disabled={!origin || !dest}
        className="mt-1 rounded-2xl bg-primary py-5 text-[1.15rem] font-black text-white disabled:opacity-40"
      >
        확인
      </button>
    </div>
  );
}
