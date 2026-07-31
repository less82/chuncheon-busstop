import { Suspense } from "react";
import AppHeader from "@/components/AppHeader";
import JourneyLive from "@/components/JourneyLive";

// 실시간 경로 안내 (v6.2): 진행 레일 타임라인 + 남은 시간, 한 화면 (?demo=1 시연 모드)
export default function RouteLivePage() {
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="가는 길 안내" />
      <main className="min-h-0 flex-1 overflow-hidden px-3 pb-2 pt-2">
        <Suspense>
          <JourneyLive />
        </Suspense>
      </main>
    </div>
  );
}
