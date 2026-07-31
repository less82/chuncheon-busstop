"use client";

// 민원 탭 (v8.1): 내 위치에서 가까운 정류장 3곳 중 골라 사진 한 장으로 제보
import { useEffect, useState } from "react";
import slimStops from "@/lib/data/stops.slim.json";
import type { SlimStop } from "@/lib/types";
import { DEFAULT_CENTER, distanceM, formatDistance } from "@/lib/geo";
import ReportForm from "./ReportForm";

const ALL = slimStops as SlimStop[];

export default function NearbyReport() {
  const [cands, setCands] = useState<(SlimStop & { d: number })[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    const compute = (lat: number, lng: number) => {
      const near = ALL.map((s) => ({ ...s, d: distanceM(lat, lng, s.lat, s.lng) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      setCands(near);
      setSel(near[0]?.id ?? null);
    };
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => compute(p.coords.latitude, p.coords.longitude),
        () => compute(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        { timeout: 5000 },
      );
    } else {
      compute(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
    }
  }, []);

  if (!cands || cands.length === 0) {
    return <p className="mt-8 text-center text-muted">가까운 정류장을 찾는 중…</p>;
  }
  const cur = cands.find((c) => c.id === sel) ?? cands[0];

  return (
    <>
      <div className="mt-4 flex flex-col gap-2">
        {cands.map((c) => {
          const isSel = c.id === cur.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSel(c.id)}
              className={`flex items-baseline justify-between rounded-2xl border-2 px-4 py-3 text-left ${
                isSel ? "border-primary bg-primary-soft" : "border-line bg-white active:bg-primary-soft"
              }`}
            >
              <span className="font-bold">{c.name}</span>
              <span className={`text-[0.85rem] font-bold ${isSel ? "text-primary" : "text-muted"}`}>
                {formatDistance(c.d)}
              </span>
            </button>
          );
        })}
      </div>

      {/* 정류장을 바꾸면 폼 초기화 (key) */}
      <ReportForm key={cur.id} stopId={cur.id} stopName={cur.name} />
    </>
  );
}
