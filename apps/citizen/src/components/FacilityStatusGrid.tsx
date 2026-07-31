import type { FacilityKey, FacilityStatus } from '@ccbs/core';
import { FACILITY_LABELS, FACILITY_ORDER } from '@ccbs/core';

const STATUS_UI: Record<FacilityStatus, { label: string; className: string }> = {
  yes: { label: '있음', className: 'bg-emerald-100 text-okay border-emerald-300' },
  no: { label: '없음', className: 'bg-rose-100 text-warn border-rose-300' },
  unknown: { label: '미확인', className: 'bg-slate-100 text-slate-600 border-slate-300' },
};

export function FacilityStatusGrid({
  facilities,
}: {
  facilities: Record<FacilityKey, FacilityStatus>;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {FACILITY_ORDER.map((key) => {
        const status = facilities[key];
        const ui = STATUS_UI[status];
        return (
          <div
            key={key}
            className={`flex min-h-touch items-center justify-between rounded-2xl border-2 px-4 py-3 ${ui.className}`}
          >
            <span className="text-lg font-extrabold">{FACILITY_LABELS[key]}</span>
            <span className="text-lg font-bold">{ui.label}</span>
          </div>
        );
      })}
    </div>
  );
}
