'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { FacilityStatusGrid } from '@/components/FacilityStatusGrid';
import { StopSearch } from '@/components/StopSearch';
import { SHELTER_RADIUS_M, getStop, nearestShelters, sheltersNearStop } from '@ccbs/core';
import type { Stop } from '@ccbs/core';

export function ShelterView() {
  const searchParams = useSearchParams();
  const [stop, setStop] = useState<Stop | null>(null);

  useEffect(() => {
    const stopId = searchParams.get('stopId');
    if (!stopId) return;
    setStop(getStop(stopId) ?? null);
  }, [searchParams]);

  const nearby = useMemo(() => (stop ? sheltersNearStop(stop.id) : []), [stop]);
  const nearest = useMemo(() => (stop ? nearestShelters(stop.id, 3) : []), [stop]);

  return (
    <div className="flex min-h-full flex-col bg-white">
      <AppHeader title="정류장 정보" backHref="/" />

      <main className="flex-1 space-y-5 pb-8 pt-5 screen-x">
        <StopSearch inline placeholder="정류장 이름을 찾아보세요" value={stop} onSelect={setStop} />

        {stop && (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-navy">{stop.name} 시설</h2>
              <FacilityStatusGrid facilities={stop.facilities} />
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-navy">{SHELTER_RADIUS_M}m 안 쿨링쉼터</h2>
              {nearby.length === 0 ? (
                <p className="text-base text-slate-500">30m 안에 등록된 쉼터가 없습니다</p>
              ) : (
                nearby.map((s) => <ShelterCard key={s.id} shelter={s} distanceM={s.distanceM} />)
              )}
            </section>

            {nearby.length === 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-navy">가까운 대안</h2>
                {nearest.map((s) => (
                  <ShelterCard key={s.id} shelter={s} distanceM={s.distanceM} />
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ShelterCard({
  shelter,
  distanceM,
}: {
  shelter: { name: string; type: string; hours: string; indoor: boolean };
  distanceM: number;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-lg font-extrabold text-slate-900">{shelter.name}</div>
          <div className="mt-1 text-base text-slate-500">
            {shelter.type} · {shelter.indoor ? '실내' : '실외'}
          </div>
        </div>
        <div className="shrink-0 rounded-xl bg-chuncheon-50 px-3 py-2 text-lg font-extrabold text-chuncheon-700">
          {distanceM}m
        </div>
      </div>
      <p className="mt-3 text-base text-slate-600">운영 {shelter.hours}</p>
    </article>
  );
}
