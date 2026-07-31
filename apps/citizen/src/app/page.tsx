'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StopSearch } from '@/components/StopSearch';
import { TabBar } from '@/components/TabBar';
import type { Stop } from '@ccbs/core';

export default function CitizenHomePage() {
  const router = useRouter();

  function openStop(stop: Stop | null) {
    if (stop) router.push(`/shelter?stopId=${encodeURIComponent(stop.id)}`);
  }

  return (
    <div className="flex min-h-full flex-col bg-white">
      <main className="flex-1 pb-6 pt-8 screen-x">
        <h1 className="text-center text-4xl font-extrabold tracking-tight text-navy">
          쉼표정류장
        </h1>
        <p className="mt-3 text-center text-base font-bold leading-snug text-slate-500">
          시원하게 기다릴 정류장을
          <br />
          찾아드립니다
        </p>

        <div className="mt-7">
          <StopSearch
            inline
            placeholder="정류장 이름을 찾아보세요"
            onSelect={openStop}
          />
        </div>

        <div className="mt-6 space-y-3">
          <Link
            href="/route"
            className="tap-feedback flex min-h-[60px] items-center justify-center rounded-2xl bg-navy text-xl font-extrabold text-white"
          >
            어느 쪽에서 타야 하나요?
          </Link>
          <Link
            href="/report"
            className="tap-feedback flex min-h-[60px] items-center justify-center rounded-2xl border-2 border-navy bg-white text-xl font-extrabold text-navy"
          >
            불편사항 알리기
          </Link>
        </div>
      </main>

      <TabBar />
    </div>
  );
}
