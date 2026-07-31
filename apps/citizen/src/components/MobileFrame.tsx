'use client';

import { useEffect, useState } from 'react';
import { FRAME_HEIGHT, FRAME_WIDTH, NAV_BAR_HEIGHT, STATUS_BAR_HEIGHT } from '@/lib/frame';

export function MobileFrame({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function fit() {
      const gutter = window.innerWidth < 480 ? 0 : 48;
      const next = Math.min(
        (window.innerWidth - gutter) / FRAME_WIDTH,
        (window.innerHeight - gutter) / FRAME_HEIGHT,
        1,
      );
      setScale(Number(next.toFixed(4)));
    }
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
    };
  }, []);

  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-[var(--stage)]">
      <div style={{ width: FRAME_WIDTH * scale, height: FRAME_HEIGHT * scale }}>
        {/* transform 이 걸린 이 요소가 내부 fixed 요소의 기준 박스가 된다 */}
        <div
          style={{
            width: FRAME_WIDTH,
            height: FRAME_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          className="relative flex flex-col overflow-hidden bg-white"
        >
          {/* 알림바 안전영역 24dp */}
          <div className="shrink-0 bg-guide" style={{ height: STATUS_BAR_HEIGHT }} />

          <div className="no-scrollbar relative flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>

          {/* 네비게이션 바 안전영역 48dp */}
          <div className="shrink-0 bg-guide" style={{ height: NAV_BAR_HEIGHT }} />
        </div>
      </div>
    </div>
  );
}
