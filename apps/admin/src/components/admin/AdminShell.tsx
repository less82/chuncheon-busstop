'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/', label: '라이브 피드' },
  { href: '/analytics', label: '분석 / 로드맵' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-chuncheon-800 text-white lg:flex lg:flex-col">
        <div className="border-b border-white/15 px-5 py-6">
          <div className="text-sm font-semibold text-chuncheon-100">춘천시 내부 시스템</div>
          <div className="mt-1 text-xl font-black">쉼표정류장 콘솔</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl px-4 py-3 text-base font-bold ${
                  active ? 'bg-white text-chuncheon' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/15 p-4">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Chuncheon Bus Stop Care · Internal
            </div>
            <h1 className="text-lg font-black text-chuncheon-800 lg:text-xl">
              {NAV.find((n) => n.href === pathname)?.label ?? '관리자'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-2 lg:hidden">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-bold ${
                    pathname === item.href ? 'bg-chuncheon text-white' : 'bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="lg:hidden">
              <LogoutButton compact />
            </div>
          </div>
        </header>
        <main className="admin-scroll flex-1 overflow-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch('/api/session', { method: 'DELETE' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={busy}
      className={
        compact
          ? 'rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50'
          : 'w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-50'
      }
    >
      {busy ? '로그아웃 중…' : '로그아웃'}
    </button>
  );
}
