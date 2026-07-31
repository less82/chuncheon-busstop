import Link from "next/link";
import { notFound } from "next/navigation";
import { getStop, nearestShelter, nearestCooling } from "@/lib/stops.server";
import { formatDistance, walkMinutes } from "@/lib/geo";
import FacilityChips from "@/components/FacilityChips";
import Arrivals from "@/components/Arrivals";
import FavoriteButton from "@/components/FavoriteButton";
import AppHeader from "@/components/AppHeader";
import { facilityCodesWithReports } from "@/lib/reports.server";

// 제보 반영이 바로 보이도록 캐시 없이 렌더
export const dynamic = "force-dynamic";

// 정류장 상세 (spec §3.4) — 도착 정보(TAGO)는 단계 2에서 연결
export default async function StopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stop = getStop(id);
  if (!stop) notFound();

  // 시설 상태 + 시민 사진 AI 판독 병합 (최신 판독 우선)
  const { fac, aiApplied } = await facilityCodesWithReports(stop);

  const shelter = nearestShelter(stop.lat, stop.lng);
  const coolingSpot = nearestCooling(stop.lat, stop.lng);

  return (
    <>
      <AppHeader />
      <main className="px-4 py-4">
      <div className="flex items-center gap-3">
        <h1 className="text-[1.2rem] font-bold">
          {stop.name}
          {stop.stopNo && (
            <span className="ml-1.5 text-[0.85rem] font-normal text-muted">({stop.stopNo})</span>
          )}
        </h1>
        <FavoriteButton stopId={stop.id} />
      </div>

      <section className="mt-5">
        <h2 className="text-[0.95rem] font-bold text-muted">실시간 도착</h2>
        <div className="mt-2">
          <Arrivals stopId={stop.id} />
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-[0.95rem] font-bold text-muted">기다리기 환경</h2>
        <div className="mt-2 rounded-2xl border border-line bg-white p-4">
          <FacilityChips fac={fac} />
          {aiApplied && (
            <p className="mt-2 text-[0.75rem] text-primary">시민 사진 AI 판독이 반영됐어요</p>
          )}
          <Link
            href={`/stops/${stop.id}/report`}
            className="mt-4 block rounded-xl bg-primary py-4 text-center text-[1rem] font-bold text-white"
          >
            불편한 곳 사진으로 알리기
          </Link>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-[0.95rem] font-bold text-muted">근처 무더위쉼터</h2>
        <div className="mt-2 flex flex-col gap-2">
          {shelter && (
            <Link
              href={`/map?lat=${shelter.shelter.lat}&lng=${shelter.shelter.lng}`}
              className="block rounded-2xl border border-line bg-white p-4 active:bg-primary-soft"
            >
              <p className="font-bold">{shelter.shelter.name}</p>
              <p className="mt-1 text-[0.85rem] text-muted">
                {formatDistance(shelter.dist)} · 걸어서 {walkMinutes(shelter.dist)}분 · 지도 보기 →
              </p>
            </Link>
          )}
          {coolingSpot && coolingSpot.dist < 500 && (
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="font-bold">{coolingSpot.facility.kind}</p>
              <p className="mt-1 text-[0.85rem] text-muted">{formatDistance(coolingSpot.dist)}</p>
            </div>
          )}
        </div>
      </section>

      {stop.routes.length > 0 && (
        <section className="mt-5">
          <h2 className="text-[0.95rem] font-bold text-muted">경유 노선</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {stop.routes.map((r) => (
              <span key={r} className="rounded-lg border border-line bg-white px-2 py-0.5 text-[0.8rem]">
                {r}
              </span>
            ))}
          </div>
        </section>
      )}
      </main>
    </>
  );
}
