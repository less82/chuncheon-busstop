import { NextResponse } from 'next/server';
import { dataSources, getKpis, listReports } from '@ccbs/core/server';
import { STOPS, facilityCoverage } from '@ccbs/core';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [kpis, reports] = await Promise.all([getKpis(), listReports({ limit: 100 })]);

  const openByStop = new Map<string, number>();
  for (const report of reports) {
    if (report.status === 'resolved') continue;
    openByStop.set(report.stop_id, (openByStop.get(report.stop_id) ?? 0) + 1);
  }

  const heatmap = STOPS.map((stop) => {
    const open = openByStop.get(stop.id) ?? 0;
    const statuses = Object.values(stop.facilities);
    return {
      id: stop.id,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      openReports: open,
      missingFacilities: statuses.filter((v) => v !== 'yes').length,
      priority:
        open * 3 +
        statuses.filter((v) => v === 'no').length * 2 +
        statuses.filter((v) => v === 'unknown').length,
    };
  })
    .filter((point) => point.priority > 0)
    .sort((a, b) => b.priority - a.priority);

  return NextResponse.json({
    kpis,
    coverage: facilityCoverage(),
    heatmap,
    reports,
    sources: dataSources(),
  });
}
