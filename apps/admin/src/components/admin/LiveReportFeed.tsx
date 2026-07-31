'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { REPORT_STATUS_LABELS, reportCategoryLabel } from '@ccbs/core';
import type { Report, ReportStatus } from '@ccbs/core';

export function LiveReportFeed({
  reports,
  onChange,
}: {
  reports: Report[];
  onChange: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-black text-slate-800">실시간 제보 피드</h2>
          <p className="text-sm text-slate-500">5초 폴링 · 사진 자동 분류 · GPS 20m 군집 긴급 승격</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-okay">LIVE</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {reports.length === 0 && (
          <li className="px-5 py-8 text-center text-slate-500">제보가 없습니다.</li>
        )}
        {reports.map((report) => (
          <li key={report.id} className="px-5 py-4">
            <ReportRow report={report} onChange={onChange} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportRow({ report, onChange }: { report: Report; onChange: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: report.id, ...body }),
      });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div className="flex min-w-0 flex-1 gap-3">
        <Thumb url={report.photo_url} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {report.is_urgent && (
              <span className="rounded bg-warn px-2 py-0.5 text-xs font-black text-white">
                긴급{report.cluster_size && report.cluster_size >= 3 ? ` · 군집 ${report.cluster_size}` : ''}
              </span>
            )}
            <span className="text-base font-black text-slate-900">{report.stop_name}</span>
            <span className="text-sm text-slate-500">{reportCategoryLabel(report.category)}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
              {REPORT_STATUS_LABELS[report.status]}
            </span>
          </div>

          {(report.vlm_tags ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(report.vlm_tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-chuncheon-50 px-2 py-0.5 text-xs font-semibold text-chuncheon-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
            <time>{new Date(report.captured_at ?? report.created_at).toLocaleString('ko-KR')}</time>
            {report.lat != null && report.lng != null && (
              <span>
                {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {(['pending', 'in_progress', 'resolved'] as ReportStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            disabled={busy || report.status === status}
            onClick={() => void patch({ status })}
            className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40 ${
              report.status === status
                ? 'bg-chuncheon text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {REPORT_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Thumb({ url }: { url: string | null }) {
  return (
    <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
          사진 없음
        </div>
      )}
    </div>
  );
}
