'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || '로그인에 실패했습니다.');
      }
      router.replace(next);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Chuncheon Bus Stop Care
        </div>
        <h1 className="mt-1 text-2xl font-black text-chuncheon-800">관리자 콘솔</h1>
        <p className="mt-2 text-sm text-slate-500">
          춘천시 내부 시스템입니다. 승인된 담당자만 접속할 수 있습니다.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-sm font-bold text-slate-700" htmlFor="password">
            접속 비밀번호
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-base outline-none focus:border-chuncheon"
            placeholder="••••••••"
          />
          {error && <p className="text-sm font-bold text-warn">{error}</p>}
          <button
            type="submit"
            disabled={busy || password.length === 0}
            className="w-full rounded-xl bg-chuncheon px-4 py-3 text-base font-black text-white disabled:opacity-50"
          >
            {busy ? '확인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
