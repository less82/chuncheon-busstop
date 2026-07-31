"use client";

// 비홈 화면 공통 헤더 (v5.1): 뒤로가기 = 브라우저 히스토리가 아니라 홈 스택 기준
// (지도 탭을 다녀와도 뒤로가기가 지도로 새지 않음)
import { usePathname, useRouter } from "next/navigation";
import { homeBackTarget } from "@/lib/homePath";

export default function AppHeader({ title }: { title?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-line bg-white/95 px-2 backdrop-blur">
      <button
        type="button"
        onClick={() => router.push(homeBackTarget(pathname))}
        aria-label="뒤로"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary active:bg-primary-soft"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 19 8 12l7-7" />
        </svg>
      </button>
      {title && <p className="truncate text-[1rem] font-bold">{title}</p>}
    </div>
  );
}
