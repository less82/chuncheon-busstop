"use client";

// 가는 길 찾기 (v7): 출발·도착 입력 → [확인] → 그 자리에 추천 경로 카드 1개가 뜬다
// (별도 추천 경로 페이지 없음). 카드를 누르면 실시간 안내(/route/live)로 진입.
// 출발 기본값 = 내 위치를 역지오코딩한 실제 주소
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { recommendJourneys, type BusLeg, type Journey, type Place } from "@/lib/journey";
import { loadJourneyState, saveJourneyState } from "@/lib/journeyStore";
import type { Arrival } from "@/lib/arrivals";
import { useKakaoReady } from "@/lib/useKakao";
import PlaceSearchModal from "./PlaceSearch";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Picking = "origin" | "dest" | null;

export default function JourneyFinder() {
  const router = useRouter();
  const kakaoReady = useKakaoReady();
  const [origin, setOrigin] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [myCoord, setMyCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [journey, setJourney] = useState<Journey | null>(null); // 확인 후 추천 1개
  const [noRoute, setNoRoute] = useState(false);
  const [best, setBest] = useState<Record<number, Arrival | null>>({}); // 구간별 가장 빨리 오는 버스

  // 이전 검색 복원 (홈 스택 상태 유지) — 추천 카드까지 복원
  // 구버전이 저장한 "내 위치" 이름은 버리고 아래 역지오코딩으로 실제 주소를 다시 받는다
  useEffect(() => {
    const s = loadJourneyState();
    if (s) {
      if (s.origin && s.origin.name !== "내 위치") setOrigin(s.origin);
      setDest(s.dest);
      if (s.candidates?.length) setJourney(s.candidates[0]);
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
  }, [kakaoReady, myCoord, origin]); // origin이 리셋되면(null) 주소를 다시 채운다

  // 추천 카드의 버스 번호: 가장 빨리 오는 한 대 (TAGO 실시간, 없으면 대표 번호)
  useEffect(() => {
    if (!journey) { setBest({}); return; }
    let dead = false;
    journey.legs.forEach((l, i) => {
      if (l.kind !== "bus") return;
      fetch(`/api/arrivals?stopId=${l.boardId}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          if (dead) return;
          const routes = l.routeNo.split("·");
          const first = (d.arrivals as Arrival[]).filter((a) => routes.includes(a.routeNo))[0] ?? null;
          setBest((p) => ({ ...p, [i]: first }));
        })
        .catch(() => { if (!dead) setBest((p) => ({ ...p, [i]: null })); });
    });
    return () => { dead = true; };
  }, [journey]);

  // 출발·도착이 바뀌면 이전 추천은 무효 → [확인]으로 되돌림
  const resetResult = () => {
    setJourney(null);
    setNoRoute(false);
  };

  // 리셋: 도착·추천을 지우고 출발은 내 위치 주소로 다시 채움 (새로고침 아님 — 입력 초기화)
  const resetAll = () => {
    setDest(null);
    setJourney(null);
    setNoRoute(false);
    setOrigin(null);
    saveJourneyState(null);
  };

  const confirm = () => {
    if (!origin || !dest) return;
    const j = recommendJourneys(origin, dest)[0] ?? null;
    setJourney(j);
    setNoRoute(!j);
    saveJourneyState({ origin, dest, candidates: j ? [j] : [], selectedId: null });
  };

  const goLive = () => {
    if (!origin || !dest || !journey) return;
    saveJourneyState({ origin, dest, candidates: [journey], selectedId: journey.id });
    router.push("/route/live");
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 헤더: 제목 + 리셋 (지우개 아이콘 + 단어 — 새로고침과 혼동 방지) */}
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-[1.25rem] font-black leading-snug">어디로 가시나요?</h1>
        <button
          type="button"
          onClick={resetAll}
          className="flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-line bg-white px-3 text-[0.85rem] font-bold text-muted active:bg-primary-soft"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
            <path d="M22 21H7" />
            <path d="m5 11 9 9" />
          </svg>
          다시 입력
        </button>
      </div>

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

      <PlaceSearchModal
        label="출발"
        open={picking === "origin"}
        onPick={(p) => { setOrigin(p); setPicking(null); resetResult(); }}
        onClose={() => setPicking(null)}
      />
      <PlaceSearchModal
        label="도착"
        open={picking === "dest"}
        onPick={(p) => { setDest(p); setPicking(null); resetResult(); }}
        onClose={() => setPicking(null)}
      />

      {/* 확인 → 추천 경로 카드 1개로 교체 */}
      {!journey && !noRoute && (
        <button
          type="button"
          onClick={confirm}
          disabled={!origin || !dest}
          className="mt-1 rounded-2xl bg-primary py-5 text-[1.15rem] font-black text-white disabled:opacity-40"
        >
          확인
        </button>
      )}

      {noRoute && (
        <div className="mt-1 rounded-2xl border-2 border-line bg-white p-5 text-center leading-relaxed text-muted">
          버스로 가는 경로를 찾지 못했어요.
          <br />
          출발·도착을 조금 옮겨서 다시 찾아보세요.
        </div>
      )}

      {journey && (
        <button
          type="button"
          onClick={goLive}
          className="mt-1 rounded-2xl border-2 border-primary bg-white p-4 text-left active:bg-primary-soft"
        >
          <div className="flex flex-col gap-2.5">
            {journey.legs.map((l, i) =>
              l.kind === "walk" ? null : (
                <div key={i}>
                  <p className="text-[0.95rem]">
                    <span className="rounded-md bg-primary px-2 py-0.5 font-black text-white">
                      {(best[i] ? best[i]!.routeNo : (l as BusLeg).routeNo.split("·")[0])}번
                    </span>
                    <span className="ml-2 font-bold text-primary">
                      {best[i] === undefined
                        ? "도착 확인 중…"
                        : best[i] === null
                          ? "도착 정보 없음"
                          : `${best[i]!.minutes}분 후 도착`}
                    </span>
                  </p>
                  <p className="mt-1 text-[0.95rem]">
                    <span className="font-bold">{(l as BusLeg).boardName}</span>
                    <span className="text-muted"> 승차 → </span>
                    <span className="font-bold">{(l as BusLeg).alightName}</span>
                  </p>
                </div>
              ),
            )}
          </div>
        </button>
      )}
    </div>
  );
}
