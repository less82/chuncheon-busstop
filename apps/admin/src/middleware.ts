import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, isValidAdminSession } from '@ccbs/core/auth';

const LOGIN_PATH = '/login';
const SESSION_API = '/api/session';

/**
 * 관리자 앱은 별도 오리진(기본 :3100)에서 단독으로 뜨며,
 * 로그인·세션 엔드포인트를 제외한 모든 요청에 세션을 요구한다.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === SESSION_API) return NextResponse.next();

  const authenticated = await isValidAdminSession(request.cookies.get(ADMIN_COOKIE)?.value);

  if (pathname === LOGIN_PATH) {
    return authenticated ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }

  if (authenticated) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: '관리자 인증이 필요합니다.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const loginUrl = new URL(LOGIN_PATH, request.url);
  if (pathname !== '/') loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // 정적 자산을 제외한 전 경로 보호
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
