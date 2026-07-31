"use client";

// 검색 결과 + 내 주변 목록 (spec §3.2)
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import slimStops from "@/lib/data/stops.slim.json";
import type { SlimStop } from "@/lib/types";
import { DEFAULT_CENTER } from "@/lib/geo";
import { searchStops, sortByDistance, sortByComfort } from "@/lib/search";
import StopCard from "./StopCard";
import SearchBox from "./SearchBox";
import AppHeader from "./AppHeader";

const ALL = slimStops as SlimStop[];
const PAGE = 20;

export default function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const near = params.get("near") === "1";
  const sort = params.get("sort") === "comfort" ? "comfort" : "dist";

  // 위치: 허용 시 GPS, 거부/실패 시 명동 기준 + 안내 (spec §3.2)
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [geoDenied, setGeoDenied] = useState(false);
  useEffect(() => {
    if (!("geolocation" in navigator)) return setGeoDenied(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoDenied(true),
      { timeout: 5000, maximumAge: 60000 },
    );
  }, []);

  const [limit, setLimit] = useState(PAGE);

  const results = useMemo(() => {
    const base = near ? ALL : searchStops(ALL, q);
    const byDist = sortByDistance(base, center);
    return sort === "comfort" ? sortByComfort(byDist) : byDist;
  }, [q, near, sort, center]);

  const setSort = (s: "dist" | "comfort") => {
    const p = new URLSearchParams(params.toString());
    if (s === "comfort") p.set("sort", "comfort");
    else p.delete("sort");
    router.replace(`/search?${p.toString()}`);
  };

  return (
    <>
      <AppHeader title={near ? "내 주변 정류장" : "정류장 검색"} />
      <main className="px-4 py-4">
      <SearchBox initialQuery={q} autoFocus={!q && !near} />

      {near && geoDenied && (
        <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-[0.85rem] text-warn">
          위치를 켜면 내 주변이 보여요. 지금은 명동(춘천 중심) 기준으로 보여드립니다.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[0.9rem] text-muted">
          {near ? "내 주변 정류장" : q ? `결과 ${results.length}곳` : "검색어를 입력해 주세요"}
        </p>
        <div className="flex overflow-hidden rounded-xl border border-line bg-white text-[0.85rem] font-bold">
          <button
            type="button"
            onClick={() => setSort("dist")}
            className={`px-3 py-1.5 ${sort === "dist" ? "bg-primary text-white" : "text-muted"}`}
          >
            가까운순
          </button>
          <button
            type="button"
            onClick={() => setSort("comfort")}
            className={`px-3 py-1.5 ${sort === "comfort" ? "bg-primary text-white" : "text-muted"}`}
          >
            편한순
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {results.slice(0, limit).map((s) => (
          <StopCard key={s.id} stop={s} />
        ))}
      </div>

      {results.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE)}
          className="mt-4 w-full rounded-2xl border-2 border-line bg-white py-4 text-[1rem] font-bold text-muted"
        >
          더 보기
        </button>
      )}

      {!near && q && results.length === 0 && (
        <p className="mt-10 text-center text-muted">
          &ldquo;{q}&rdquo; 정류장을 찾지 못했어요.
          <br />
          이름을 조금 줄여서 찾아보세요.
        </p>
      )}
      </main>
    </>
  );
}
