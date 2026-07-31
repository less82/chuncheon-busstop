// 갤럭시 하단 3버튼 내비게이션 목업 (최근앱 | 홈 | 뒤로) — 데스크톱 프레임 전용
export default function GalaxyNavBar() {
  return (
    <div className="hidden h-11 shrink-0 items-center justify-around border-t border-line/60 bg-bg px-10 text-gray-500 lg:flex">
      {/* 최근 앱 */}
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <rect x="0" y="1" width="3" height="12" rx="1" fill="currentColor" />
        <rect x="5.5" y="1" width="3" height="12" rx="1" fill="currentColor" />
        <rect x="11" y="1" width="3" height="12" rx="1" fill="currentColor" />
      </svg>
      {/* 홈 */}
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      {/* 뒤로 */}
      <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden>
        <path d="M10 1 L3 7 L10 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
