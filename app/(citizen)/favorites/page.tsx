"use client";

// 저장한 정류장 (spec §3.7) — localStorage
import { useEffect, useState } from "react";
import slimStops from "@/lib/data/stops.slim.json";
import type { SlimStop } from "@/lib/types";
import StopCard from "@/components/StopCard";
import AppHeader from "@/components/AppHeader";

const ALL = slimStops as SlimStop[];

export default function FavoritesPage() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      setIds(JSON.parse(localStorage.getItem("favStops") ?? "[]"));
    } catch {
      setIds([]);
    }
  }, []);

  const stops = ALL.filter((s) => ids.includes(s.id));

  return (
    <>
      <AppHeader title="저장한 정류장" />
      <main className="px-4 py-5">
      {stops.length === 0 ? (
        <p className="mt-10 text-center leading-relaxed text-muted">
          아직 저장한 정류장이 없어요.
          <br />
          정류장에서 [저장]을 누르면
          <br />
          여기에 모아둘 수 있어요.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {stops.map((s) => (
            <StopCard key={s.id} stop={s} />
          ))}
        </div>
      )}
      </main>
    </>
  );
}
