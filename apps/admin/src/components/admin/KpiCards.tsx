import { FACILITY_LABELS } from '@ccbs/core';
import type { FacilityKey } from '@ccbs/core';

export function KpiCards({
  kpis,
}: {
  kpis: {
    totalStops: number;
    unverifiedFacilities: number;
    totalReports: number;
    urgentIssues: number;
  };
}) {
  const items = [
    { label: '전체 정류장', value: kpis.totalStops.toLocaleString(), tone: 'text-chuncheon' },
    { label: '시설 미확인', value: kpis.unverifiedFacilities.toLocaleString(), tone: 'text-amber-700' },
    { label: '누적 시민 제보', value: kpis.totalReports.toLocaleString(), tone: 'text-slate-800' },
    { label: '긴급 이슈', value: kpis.urgentIssues.toLocaleString(), tone: 'text-warn' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-500">{item.label}</div>
          <div className={`mt-2 text-3xl font-black ${item.tone}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function CoverageBars({
  coverage,
}: {
  coverage: Array<{ key: FacilityKey; yes: number; no: number; unknown: number; total: number }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-800">시설 커버리지 (시드 {coverage[0]?.total ?? 0}곳)</h2>
      <p className="mt-1 text-sm text-slate-500">있음 / 없음 / 미확인 비율</p>
      <div className="mt-4 space-y-4">
        {coverage.map((row) => {
          const yes = (row.yes / row.total) * 100;
          const no = (row.no / row.total) * 100;
          const unknown = (row.unknown / row.total) * 100;
          return (
            <div key={row.key}>
              <div className="mb-1 flex justify-between text-sm font-semibold">
                <span>{FACILITY_LABELS[row.key]}</span>
                <span className="text-slate-500">
                  {row.yes}/{row.no}/{row.unknown}
                </span>
              </div>
              <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
                <div className="bg-emerald-500" style={{ width: `${yes}%` }} title="있음" />
                <div className="bg-rose-500" style={{ width: `${no}%` }} title="없음" />
                <div className="bg-slate-400" style={{ width: `${unknown}%` }} title="미확인" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-4 text-xs font-semibold text-slate-600">
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />있음</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />없음</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />미확인</span>
      </div>
    </div>
  );
}
