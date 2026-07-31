import { getGovStats } from "@/lib/gov.server";
import { FAC_KEYS, FAC_LABEL } from "@/lib/types";
import LiveFeed from "@/components/gov/LiveFeed";

// 시설 실태 대시보드 (spec §4.1) — 제보 반영이 바로 보이도록 캐시 없음
export const dynamic = "force-dynamic";

function Kpi({ label, value, accent = false, sub }: { label: string; value: number; accent?: boolean; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-black ${accent ? "text-warn" : "text-ink"}`}>
        {value.toLocaleString()}
      </p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export default async function GovPage() {
  const stats = await getGovStats();

  return (
    <main>
      <h1 className="text-xl font-black">시설 현황</h1>
      <p className="mt-1 text-sm text-muted">
        모든 수치는 공공데이터·현장조사·시민 사진 AI 판독에서 직접 집계됩니다 (가중치 없음)
      </p>

      {/* KPI 4종 */}
      <div className="mt-5 grid grid-cols-4 gap-4">
        <Kpi label="전체 정류장" value={stats.totalStops} sub="춘천시 위치정보 기준" />
        <Kpi label="그늘 미확인 정류장" value={stats.shadeUnknown} accent sub="공개 데이터에 없는 정보 — 시민 제보로 채워지는 중" />
        <Kpi label="누적 시민 제보" value={stats.reportCount} sub={`AI 판독으로 미확인 ${stats.aiResolvedCount}건 해소`} />
        <Kpi label="폭염 취약 정류장" value={stats.heatVulnerable} accent sub="그늘 확인 안 됨 + 무더위쉼터 300m 밖" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        {/* 시설 보유율 스택바 — 미확인(회색)이 이 화면의 주인공 */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-black">시설 보유율</h2>
          <p className="mt-1 text-xs text-muted">있음 · 없음 · 미확인 (전체 {stats.totalStops.toLocaleString()}곳)</p>
          <div className="mt-4 flex flex-col gap-4">
            {FAC_KEYS.map((k) => {
              const b = stats.byFacility[k];
              const total = b.yes + b.no + b.unknown;
              const pct = (n: number) => (n / total) * 100;
              return (
                <div key={k}>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold">{FAC_LABEL[k]}</span>
                    <span className="text-muted">
                      있음 {b.yes.toLocaleString()} · 없음 {b.no.toLocaleString()} · 미확인{" "}
                      {b.unknown.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-5 overflow-hidden rounded-lg bg-gray-200">
                    <div className="bg-primary" style={{ width: `${pct(b.yes)}%` }} />
                    <div className="bg-warn/70" style={{ width: `${pct(b.no)}%` }} />
                    <div className="bg-gray-300" style={{ width: `${pct(b.unknown)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-muted">
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-primary" />있음</span>
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-warn/70" />없음</span>
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-gray-300" />미확인</span>
          </div>
        </section>

        {/* 실시간 제보 피드 */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-black">실시간 시민 제보</h2>
          <p className="mt-1 text-xs text-muted">사진 한 장 → AI가 민원을 분류하고 시설을 판독합니다</p>
          <LiveFeed />
        </section>
      </div>
    </main>
  );
}
