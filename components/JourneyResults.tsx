"use client";

// 추천 경로 (v6.2): 최소 시간 경로 2개. 같은 경로의 여러 버스 중 '가장 빨리 오는 한 대'만 표시
// (TAGO 실시간 도착 기준, 정보 없으면 대표 번호 폴백). 카드를 탭하면 실시간 안내(/route/live)로 진입
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { recommendJourneys, type Journey, type BusLeg, type Place } from "@/lib/journey";
import { loadJourneyState, saveJourneyState } from "@/lib/journeyStore";
import type { Arrival } from "@/lib/arrivals";
import FacilityChips from "./FacilityChips";

function JourneyCard({ j, rank, onSelect }: { j: Journey; rank: number; onSelect: () => void }) {
  // 버스 구간별 가장 빨리 오는 버스 (undefined=확인 중, null=정보 없음)
  const [best, setBest] = useState<Record<number, Arrival | null>>({});

  useEffect(() => {
    let dead = false;
    j.legs.forEach((l, i) => {
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
  }, [j]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border-2 p-4 text-left active:opacity-80 ${rank === 1 ? "border-primary bg-primary-soft" : "border-line bg-white"}`}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-[1.25rem] font-black">
          {rank === 1 && <span className="mr-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[0.75rem] text-white">추천</span>}
          약 {j.estMinutes}분 <span className="text-[0.8rem] font-normal text-muted">(예상)</span>
        </p>
        <p className="text-[0.85rem] font-bold text-muted">
          {j.transfers === 0 ? "환승 없음" : `환승 ${j.transfers}회`}
        </p>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {j.legs.map((l, i) =>
          l.kind === "walk" ? (
            <p key={i} className="text-[0.8rem] text-muted">
              걷기 {l.minutes}분 — {l.from} → {l.to}
            </p>
          ) : (
            <div key={i} className="rounded-xl bg-white/80 p-2.5 ring-1 ring-line/60">
              <p className="text-[0.95rem]">
                <span className="rounded-md bg-primary px-2 py-0.5 font-black text-white">
                  {(best[i] ? best[i]!.routeNo : (l as BusLeg).routeNo.split("·")[0])}번
                </span>
                {best[i] && (
                  <span className="ml-1.5 text-[0.8rem] font-bold text-primary">{best[i]!.minutes}분 후</span>
                )}
                <span className="ml-2 font-bold">{(l as BusLeg).boardName}</span>
                <span className="text-muted"> 승차 → </span>
                <span className="font-bold">{(l as BusLeg).alightName}</span>
                <span className="ml-1 text-[0.75rem] text-muted">({(l as BusLeg).rideStops}개 정류장)</span>
              </p>
              <div className="mt-1.5">
                <FacilityChips fac={(l as BusLeg).boardFac} compact />
              </div>
            </div>
          ),
        )}
      </div>

      <p className="mt-2.5 text-right text-[0.85rem] font-bold text-primary">이 경로로 안내 →</p>
    </button>
  );
}

export default function JourneyResults() {
  const router = useRouter();
  const [state, setState] = useState<{ origin: Place; dest: Place } | null>(null);
  const [journeys, setJourneys] = useState<Journey[] | null>(null);

  useEffect(() => {
    const s = loadJourneyState();
    if (!s) {
      router.replace("/route");
      return;
    }
    setState({ origin: s.origin, dest: s.dest });
    // 계산이 무겁지 않지만(수십 ms) 첫 페인트 후 실행
    const t = setTimeout(() => setJourneys(recommendJourneys(s.origin, s.dest)), 0);
    return () => clearTimeout(t);
  }, [router]);

  // 경로 선택 → 상태 저장 후 실시간 안내로
  const select = (j: Journey) => {
    if (!state) return;
    saveJourneyState({ origin: state.origin, dest: state.dest, candidates: journeys ?? [], selectedId: j.id });
    router.push("/route/live");
  };

  if (!state) return null;

  return (
    <div className="mt-4">
      <p className="rounded-2xl bg-white px-4 py-3 text-[0.9rem] ring-1 ring-line">
        <span className="font-bold">{state.origin.name}</span>
        <span className="text-muted"> → </span>
        <span className="font-bold">{state.dest.name}</span>
      </p>

      {journeys === null ? (
        <p className="mt-8 text-center text-muted">경로를 찾는 중…</p>
      ) : journeys.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-line bg-white p-5 text-center leading-relaxed text-muted">
          버스로 가는 경로를 찾지 못했어요.
          <br />
          출발·도착을 조금 옮겨서 다시 찾아보세요.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {journeys.map((j, i) => (
            <JourneyCard key={j.id} j={j} rank={i + 1} onSelect={() => select(j)} />
          ))}
          <p className="text-center text-[0.7rem] text-muted">
            경로를 누르면 실시간 안내가 시작돼요 · 예상 시간은 도보·정차 기준 추정값이에요
          </p>
        </div>
      )}
    </div>
  );
}
