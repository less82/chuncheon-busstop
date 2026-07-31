import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  deriveSessionToken,
  getAdminPassword,
} from '@ccbs/core/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** 프록시 뒤 HTTPS까지 고려해 Secure 플래그를 결정 (HTTP 환경에서 세션 유실 방지) */
function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get('x-forwarded-proto');
  if (forwarded) return forwarded.split(',')[0].trim() === 'https';
  return new URL(request.url).protocol === 'https:';
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = body.password ?? '';

  if (password !== getAdminPassword()) {
    // 무차별 대입 완화용 지연
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: await deriveSessionToken(password),
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(request),
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
  return response;
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(request),
    path: '/',
    maxAge: 0,
  });
  return response;
}
