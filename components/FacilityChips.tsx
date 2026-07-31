// 시설 5종 단어 칩 (spec §3 공통): 있음=파랑 채움, 없음=회색 취소선, 몰라요=점선
import { FAC_KEYS, FAC_LABEL, type FacStatus } from "@/lib/types";

const STYLE: Record<FacStatus, string> = {
  y: "bg-primary-soft text-primary border-primary/30 font-bold",
  n: "bg-gray-100 text-muted border-line line-through",
  u: "bg-white text-muted border-dashed border-line",
};

const SUFFIX: Record<FacStatus, string> = { y: " 있음", n: " 없음", u: " 몰라요" };

export default function FacilityChips({ fac, compact = false }: { fac: string; compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FAC_KEYS.map((key, i) => {
        const st = (fac[i] ?? "u") as FacStatus;
        return (
          <span
            key={key}
            className={`rounded-lg border px-2 py-0.5 text-[0.75rem] ${STYLE[st]}`}
          >
            {FAC_LABEL[key]}
            {compact ? "" : SUFFIX[st]}
          </span>
        );
      })}
    </div>
  );
}
