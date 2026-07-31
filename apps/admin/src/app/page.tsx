'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { CoverageBars, KpiCards } from '@/components/admin/KpiCards';
import { LiveReportFeed } from '@/components/admin/LiveReportFeed';
import { ADMIN_POLL_INTERVAL_MS } from '@ccbs/core';
import type { FacilityKey, Report } from '@ccbs/core';

interface StatsPayload {
  kpis: {
    totalStops: number;
    unverifiedFacilities: number;
    totalReports: number;
    urgentIssues: number;
  };
  coverage: Array<{
    key: FacilityKey;
    yes: number;
    no: number;
    unknown: number;
    total: number;
  }>;
  reports: Report[];
  sources: { supabase: boolean; tago: boolean; vlm: boolean };
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      const json = (await res.json()) as StatsPayload;
      if (!res.ok) throw new Error('통계를 불러오지 못했습니다.');
      setData(json);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [router]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), ADMIN_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-warn">
            {error}
          </div>
        )}

        {data ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <SourceBadge on={data.sources.supabase} label="Supabase" />
              <SourceBadge on={data.sources.tago} label="TAGO" />
              <SourceBadge on={data.sources.vlm} label="VLM" />
              <span className="text-slate-400">꺼져 있으면 Mock 폴백으로 단독 동작</span>
            </div>

            <KpiCards kpis={data.kpis} />

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <LiveReportFeed reports={data.reports} onChange={() => void load()} />
              </div>
              <CoverageBars coverage={data.coverage} />
            </div>
          </>
        ) : (
          <p className="text-slate-500">대시보드 로딩 중…</p>
        )}
      </div>
    </AdminShell>
  );
}

function SourceBadge({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 ${
        on ? 'bg-emerald-100 text-okay' : 'bg-slate-200 text-slate-600'
      }`}
    >
      {label}: {on ? 'LIVE' : 'MOCK'}
    </span>
  );
}
