'use client';

import { useMemo, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { ArrivalCard } from '@/components/ArrivalCard';
import { StopSearch } from '@/components/StopSearch';
import { TabBar } from '@/components/TabBar';
import { formatArrivalText, resolveDirections } from '@ccbs/core';
import type { Arrival, DirectionResult, Stop } from '@ccbs/core';

export default function RoutePage() {
  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const directions = useMemo(() => {
    if (!origin || !destination) return [] as DirectionResult[];
    return resolveDirections(origin.id, destination.id);
  }, [origin, destination]);

  async function loadArrivals(stop: Stop | null) {
    if (!stop) {
      setArrivals([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/arrivals?stopId=${stop.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '????? ???? ?????.');
      setArrivals(json.arrivals as Arrival[]);
    } catch (e) {
      setError((e as Error).message);
      setArrivals([]);
    } finally {
      setLoading(false);
    }
  }

  function handleOrigin(stop: Stop | null) {
    setOrigin(stop);
    void loadArrivals(stop);
  }

  return (
    <div className="flex min-h-full flex-col bg-white">
      <AppHeader title="???" backHref="/" />

      <main className="flex-1 space-y-5 pb-8 pt-5 screen-x">
        <StopSearch label="??" value={origin} onSelect={handleOrigin} />
        <StopSearch label="??" value={destination} onSelect={setDestination} />

        {directions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">?? ??</h2>
            {directions.map((dir) => {
              const arrival = arrivals.find(
                (a) => a.routeNo === dir.routeNo && a.headsign === dir.headsign,
              );
              return (
                <article
                  key={`${dir.routeId}-${dir.bound}`}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-5"
                >
                  <div className="text-3xl font-extrabold text-chuncheon">{dir.routeNo}?</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">{dir.headsign} ??</div>
                  <p className="mt-3 text-lg font-bold text-slate-800">
                    {arrival ? `${formatArrivalText(arrival.arrTimeSec)} ??` : '???? ?? ?'}
                  </p>
                  <p className="mt-1 text-base text-slate-500">{dir.stopCount}? ???</p>
                </article>
              );
            })}
          </section>
        )}

        {origin && directions.length === 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-navy">{origin.name} ????</h2>
            {loading && <p className="text-base text-slate-500">???? ?</p>}
            {error && <p className="text-base font-bold text-warn">{error}</p>}
            {!loading && !error && arrivals.length === 0 && (
              <p className="text-base text-slate-500">?? ?? ??? ????</p>
            )}
            {arrivals.map((arrival, idx) => (
              <ArrivalCard key={`${arrival.routeId}-${arrival.headsign}-${idx}`} arrival={arrival} />
            ))}
          </section>
        )}
      </main>

      <TabBar />
    </div>
  );
}
