"use client";

// 비홈 화면 공통 헤더: 뒤로가기만 (v5: 홈 버튼 제거 — 홈은 하단 탭으로)
import { useRouter } from "next/navigation";

export default function AppHeader({ title }: { title?: string }) {
  const router = useRouter();
  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-white/95 px-3 py-2 backdrop-blur">
      <button
        type="button"
        onClick={() => router.back()}
        className="min-h-11 rounded-xl px-3 text-[0.95rem] font-bold text-primary active:bg-primary-soft"
      >
        ← 뒤로
      </button>
      {title && <p className="ml-1 truncate text-[1rem] font-bold">{title}</p>}
    </div>
  );
}
