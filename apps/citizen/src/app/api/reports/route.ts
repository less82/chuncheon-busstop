import { NextResponse } from 'next/server';
import { createReport, listReports } from '@ccbs/core/server';
import type { NewReportInput } from '@ccbs/core';

export const dynamic = 'force-dynamic';

/**
 * 시민 앱은 조회(GET)와 등록(POST)만 노출한다.
 * 상태 변경(PATCH)은 관리자 앱에만 존재한다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stopId = searchParams.get('stopId') ?? undefined;
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100);

  const reports = await listReports({ stopId, limit });
  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<NewReportInput>;

  if (!body.photo_url) {
    return NextResponse.json({ error: '사진이 필요합니다.' }, { status: 400 });
  }

  const lat = typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : null;
  const lng = typeof body.lng === 'number' && Number.isFinite(body.lng) ? body.lng : null;
  const capturedAt =
    body.captured_at && !Number.isNaN(Date.parse(body.captured_at))
      ? new Date(body.captured_at).toISOString()
      : null;

  const report = await createReport({
    photo_url: body.photo_url,
    lat,
    lng,
    captured_at: capturedAt,
  });

  return NextResponse.json({ report }, { status: 201 });
}
