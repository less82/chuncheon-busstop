import { formatArrivalText } from '@ccbs/core';
import type { Arrival } from '@ccbs/core';

export function ArrivalCard({ arrival }: { arrival: Arrival }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-3xl font-extrabold text-chuncheon">{arrival.routeNo}번</div>
          <div className="mt-1 truncate text-lg font-bold text-slate-900">
            {arrival.headsign} 방면
          </div>
        </div>
        <div className="shrink-0 rounded-2xl bg-chuncheon px-4 py-2 text-center text-white">
          <div className="text-xl font-extrabold leading-none">
            {formatArrivalText(arrival.arrTimeSec)}
          </div>
          <div className="mt-1 text-sm">{arrival.arrPrevStationCnt}정류장 전</div>
        </div>
      </div>
      {arrival.lowPlate && (
        <div className="mt-3 inline-block rounded-full bg-emerald-50 px-3 py-1 text-base font-bold text-okay">
          저상버스
        </div>
      )}
    </article>
  );
}
