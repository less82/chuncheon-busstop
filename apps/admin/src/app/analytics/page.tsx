'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';

interface HeatPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  openReports: number;
  missingFacilities: number;
  priority: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [heatmap, setHeatmap] = useState<HeatPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        const json = await res.json();
        setHeatmap(json.heatmap as HeatPoint[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const maxPriority = Math.max(1, ...heatmap.map((h) => h.priority));

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-800">쉼터 설치 우선순위 히트맵 (로드맵)</h2>
          <p className="mt-1 text-sm text-slate-500">
            미해결 제보 × 3 + 시설 없음 × 2 + 미확인 × 1 로 우선순위를 산출합니다.
            실제 지도 SDK 연동 전, 격자 히트맵으로 우선 설치 후보를 시각화합니다.
          </p>

          {loading ? (
            <p className="mt-6 text-slate-500">로딩 중…</p>
          ) : (
            <>
              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-chuncheon-50 p-4">
                <div className="relative mx-auto aspect-[4/3] max-w-3xl">
                  {/* 춘천 대략 바운딩 박스에 정규화한 점 배치 */}
                  {heatmap.map((point) => {
                    const { x, y } = project(point.lat, point.lng);
                    const intensity = point.priority / maxPriority;
                    const size = 18 + intensity * 42;
                    return (
                      <div
                        key={point.id}
                        title={`${point.name} · 우선순위 ${point.priority}`}
                        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          width: size,
                          height: size,
                          background: `rgba(217, 48, 37, ${0.25 + intensity * 0.65})`,
                        }}
                      />
                    );
                  })}
                  <div className="pointer-events-none absolute inset-0 rounded-lg border border-dashed border-chuncheon-200" />
                  <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-500">
                    N ↑ · 춘천시 개략 좌표계
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">순위</th>
                      <th className="px-3 py-2 font-semibold">정류장</th>
                      <th className="px-3 py-2 font-semibold">미해결 제보</th>
                      <th className="px-3 py-2 font-semibold">부족한 시설</th>
                      <th className="px-3 py-2 font-semibold">우선순위</th>
                      <th className="px-3 py-2 font-semibold">권고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatmap.slice(0, 15).map((row, idx) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-bold">{idx + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{row.name}</td>
                        <td className="px-3 py-2">{row.openReports}</td>
                        <td className="px-3 py-2">{row.missingFacilities}</td>
                        <td className="px-3 py-2">
                          <span className="rounded bg-rose-100 px-2 py-0.5 font-bold text-warn">
                            {row.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.openReports >= 2
                            ? '긴급 현장점검 + 그늘막 우선 설치'
                            : row.missingFacilities >= 3
                              ? '시설 보강 후보'
                              : '모니터링'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-800">로드맵</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>QR/PWA 사진 제보 → VLM 자동 분류 운영 (현재 데모)</li>
            <li>촬영 위치·시각 자동 수집 + GPS 20m 군집 긴급 승격</li>
            <li>TAGO 실연동 + 정류장 마스터 1,889곳 전량 적재</li>
            <li>히트맵 기반 쿨링쉼터 설치 예산 배분 의사결정</li>
          </ol>
        </section>
      </div>
    </AdminShell>
  );
}

/** 춘천시 대략 바운딩 박스 → 퍼센트 좌표 */
function project(lat: number, lng: number) {
  const minLat = 37.81;
  const maxLat = 37.93;
  const minLng = 127.68;
  const maxLng = 127.76;
  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = (1 - (lat - minLat) / (maxLat - minLat)) * 100;
  return {
    x: Math.min(96, Math.max(4, x)),
    y: Math.min(96, Math.max(4, y)),
  };
}
