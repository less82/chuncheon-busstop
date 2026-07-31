import { NextResponse } from 'next/server';
import { uploadPhoto } from '@ccbs/core/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file이 필요합니다.' }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: '파일은 8MB 이하여야 합니다.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadPhoto(buffer, file.name || 'photo.jpg', file.type || 'image/jpeg');

  return NextResponse.json({ url });
}
