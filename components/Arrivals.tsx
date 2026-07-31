"use client";

// 실시간 도착 (spec §3.4): 15초 자동 갱신, 갱신 시각 표시, 빈 응답 안내
import { useCallback, useEffect, useState } from "react";
import type { ArrivalsResponse } from "@/lib/arrivals";

export default function Arrivals({ stopId }: { stopId: string }) {
  const [data, setData] = useState<ArrivalsResponse | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/arrivals?stopId=${stopId}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, [stopId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  if (error && !data)
    return (
      <div className="rounded-2xl border border-line bg-white p-4 text-center text-muted">
        도착 정보를 불러오지 못했어요
      </div>
    );

  if (!data)
    return (
      <div className="rounded-2xl border border-line bg-white p-4 text-center text-muted">
        도착 정보를 확인하고 있어요…
      </div>
    );

  const time = new Date(data.updatedAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      {data.arrivals.length === 0 ? (
        <p className="text-center leading-relaxed text-muted">
          지금은 도착 예정 버스가 없어요
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.arrivals.map((a, i) => (
            <li key={`${a.routeNo}-${i}`} className="flex items-center justify-between gap-3">
              <span className="rounded-lg bg-primary-soft px-2.5 py-1 text-[1rem] font-black text-primary">
                {a.routeNo}번
              </span>
              <span className="text-right">
                <span className="text-[1.15rem] font-black">
                  {a.minutes <= 1 ? "곧 도착" : `${a.minutes}분`}
                </span>
                {a.stopsAway > 0 && (
                  <span className="ml-1.5 text-[0.8rem] text-muted">({a.stopsAway}정류장 전)</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-right text-[0.7rem] text-muted">{time} 기준</p>
    </div>
  );
}
