"use client";

// 갤럭시 상단 상태바 목업 (데스크톱 프레임 전용 — 실제 폰에선 숨김)
import { useEffect, useState } from "react";

export default function StatusBar() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative hidden h-8 shrink-0 items-center justify-between bg-bg px-5 text-[12px] font-semibold text-ink lg:flex">
      <span>{time}</span>
      {/* 펀치홀 카메라 */}
      <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
      <span className="flex items-center gap-1.5">
        {/* 신호 */}
        <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden>
          <rect x="0" y="7" width="2" height="3" rx="0.5" fill="currentColor" />
          <rect x="4" y="5" width="2" height="5" rx="0.5" fill="currentColor" />
          <rect x="8" y="3" width="2" height="7" rx="0.5" fill="currentColor" />
          <rect x="12" y="0" width="2" height="10" rx="0.5" fill="currentColor" />
        </svg>
        {/* 와이파이 */}
        <svg width="13" height="10" viewBox="0 0 13 10" aria-hidden>
          <path d="M6.5 10 L0 3 A9.2 9.2 0 0 1 13 3 Z" fill="currentColor" />
        </svg>
        {/* 배터리 */}
        <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden>
          <rect x="0" y="0.5" width="17" height="9" rx="2" fill="none" stroke="currentColor" />
          <rect x="1.5" y="2" width="12" height="6" rx="1" fill="currentColor" />
          <rect x="18" y="3" width="2" height="4" rx="1" fill="currentColor" />
        </svg>
      </span>
    </div>
  );
}
