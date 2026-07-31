import { REPORT_STATUS_LABELS, reportCategoryLabel } from '@ccbs/core';
import type { Report } from '@ccbs/core';

const STATUS_TONE: Record<Report['status'], string> = {
  pending: 'bg-chuncheon text-white',
  in_progress: 'bg-amber-500 text-white',
  resolved: 'bg-okay text-white',
};

export function ReportStatusCard({ report }: { report: Report }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {report.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={report.photo_url} alt="" className="h-36 w-full object-cover" />
      )}

      <div className="space-y-2 px-4 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${STATUS_TONE[report.status]}`}
          >
            {REPORT_STATUS_LABELS[report.status]}
          </span>
          <h3 className="min-w-0 flex-1 truncate text-lg font-extrabold text-navy">
            {report.stop_name}
          </h3>
        </div>

        <div className="text-base text-slate-500">{reportCategoryLabel(report.category)}</div>

        <time className="block text-base text-slate-400">
          {new Date(report.captured_at ?? report.created_at).toLocaleString('ko-KR', {
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>
    </article>
  );
}
