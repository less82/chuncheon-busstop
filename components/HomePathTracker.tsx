"use client";

// 현재 경로가 홈 스택이면 기록 (v5 홈 탭 복원용) — citizen 레이아웃에 상주
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackHomePath } from "@/lib/homePath";

export default function HomePathTracker() {
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    if (pathname.startsWith("/map") || pathname.startsWith("/favorites") || pathname.startsWith("/report")) return;
    const qs = params.toString();
    trackHomePath(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, params]);
  return null;
}
