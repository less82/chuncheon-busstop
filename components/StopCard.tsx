// 정류장 카드 (spec §3.2) — 검색 결과·저장 탭 공용
import Link from "next/link";
import type { SlimStop } from "@/lib/types";
import { formatDistance } from "@/lib/geo";
import FacilityChips from "./FacilityChips";

export default function StopCard({ stop }: { stop: SlimStop & { dist?: number } }) {
  const noShade = stop.fac[0] === "n"; // 폭염 경고 배지 (그늘 없음 확인된 곳만)
  return (
    <Link
      href={`/stops/${stop.id}`}
      className="block rounded-2xl border border-line bg-white p-4 active:bg-primary-soft"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[1.05rem] font-bold">
          {stop.name}
          {stop.no && <span className="ml-1.5 text-[0.8rem] font-normal text-muted">({stop.no})</span>}
        </p>
        {stop.dist !== undefined && (
          <p className="shrink-0 text-[0.9rem] font-bold text-primary">{formatDistance(stop.dist)}</p>
        )}
      </div>
      <div className="mt-2">
        <FacilityChips fac={stop.fac} />
      </div>
      {noShade && (
        <p className="mt-2 inline-block rounded-lg bg-warn-soft px-2 py-0.5 text-[0.75rem] font-bold text-warn">
          한낮 더위 주의 — 그늘 없음
        </p>
      )}
    </Link>
  );
}
