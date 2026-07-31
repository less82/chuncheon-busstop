'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: '홈' },
  { href: '/route', label: '길찾기' },
  { href: '/my-reports', label: '내 제보' },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 flex border-t border-slate-200 bg-white">
      {TABS.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex min-h-touch flex-1 items-center justify-center py-2 text-base font-bold ${
              active ? 'text-chuncheon' : 'text-slate-400'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
