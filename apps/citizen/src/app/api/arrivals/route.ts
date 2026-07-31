import { NextResponse } from 'next/server';
import { dataSources, getArrivals } from '@ccbs/core/server';
import { getStop } from '@ccbs/core';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stopId = searchParams.get('stopId');

  if (!stopId) {
    return NextResponse.json({ error: 'stopId가 필요합니다.' }, { status: 400 });
  }

  const stop = getStop(stopId);
  if (!stop) {
    return NextResponse.json({ error: '정류장을 찾을 수 없습니다.' }, { status: 404 });
  }

  const arrivals = await getArrivals(stopId);
  return NextResponse.json({
    stop,
    arrivals,
    sources: dataSources(),
  });
}
