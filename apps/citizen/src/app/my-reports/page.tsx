'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { ReportStatusCard } from '@/components/ReportStatusCard';
import { TabBar } from '@/components/TabBar';
import type { Report } from '@ccbs/core';

const MY_REPORTS_KEY = 'chuncheon-my-report-ids';

export default function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/reports?limit=50');
        const json = (await res.json()) as { reports: Report[] };
        if (cancelled) return;

        const mine = JSON.parse(localStorage.getItem(MY_REPORTS_KEY) || '[]') as string[];
        if (mine.length > 0) {
          const mineSet = new Set(mine);
          setReports(json.reports.filter((r) => mineSet.has(r.id)));
        } else {
          // 첫 방문 데모: 최근 제보를 미리보기로 노출
          setReports(json.reports.slice(0, 5));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-white">
      <AppHeader title="내 제보" backHref="/" />

      <main className="flex-1 space-y-4 pb-8 pt-5 screen-x">
        {loading && <p className="text-lg text-slate-500">불러오는 중</p>}
        {!loading && reports.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center">
            <p className="text-lg font-bold text-slate-700">아직 제보가 없습니다</p>
            <Link
              href="/report"
              className="tap-feedback mt-5 inline-flex min-h-touch items-center rounded-2xl bg-navy px-6 text-lg font-extrabold text-white"
            >
              사진 찍기
            </Link>
          </div>
        )}

        {reports.map((report) => (
          <ReportStatusCard key={report.id} report={report} />
        ))}
      </main>

      <TabBar />
    </div>
  );
}
