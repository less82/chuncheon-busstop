"use client";

// 비홈 화면 공통 헤더 (v5.1): 뒤로가기 = 브라우저 히스토리가 아니라 홈 스택 기준
// (지도 탭을 다녀와도 뒤로가기가 지도로 새지 않음)
import { usePathname, useRouter } from "next/navigation";
import { homeBackTarget } from "@/lib/homePath";

export default function AppHeader({ title }: { title?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-white/95 px-3 py-2 backdrop-blur">
      <button
        type="button"
        onClick={() => router.push(homeBackTarget(pathname))}
        className="min-h-11 rounded-xl px-3 text-[0.95rem] font-bold text-primary active:bg-primary-soft"
      >
        ← 뒤로
      </button>
      {title && <p className="ml-1 truncate text-[1rem] font-bold">{title}</p>}
    </div>
  );
}
