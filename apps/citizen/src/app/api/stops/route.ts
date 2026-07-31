import { NextResponse } from 'next/server';
import { searchStops } from '@ccbs/core';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  return NextResponse.json({ stops: searchStops(q, 10) });
}
