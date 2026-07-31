import { NextResponse } from 'next/server';
import { getLocalPhoto } from '@ccbs/core/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: { key: string } }) {
  const photo = getLocalPhoto(decodeURIComponent(params.key));
  if (!photo) {
    return NextResponse.json({ error: '사진을 찾을 수 없습니다.' }, { status: 404 });
  }

  const contentType = new URL(request.url).searchParams.get('ct') || 'image/jpeg';

  return new NextResponse(new Uint8Array(photo), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
