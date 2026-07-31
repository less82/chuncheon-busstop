/**
 * 관리자(B2G) 전용 세션.
 * Edge 미들웨어와 Node 라우트 핸들러 양쪽에서 동작하도록
 * Web Crypto(subtle)만 사용한다.
 */

export const ADMIN_COOKIE = 'ccbs_admin_session';
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8; // 8시간

const DEFAULT_PASSWORD = 'chuncheon2026';

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
}

export function isAdminPasswordDefault(): boolean {
  return !process.env.ADMIN_PASSWORD;
}

/** 비밀번호에서 세션 토큰(해시)을 파생. 쿠키에 원문을 담지 않기 위함. */
export async function deriveSessionToken(password: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET || 'ccbs-admin-session-salt';
  const bytes = new TextEncoder().encode(`${secret}::${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function isValidAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await deriveSessionToken(getAdminPassword());
  return safeEqual(token, expected);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
