import { Suspense } from "react";
import MapView from "@/components/MapView";

// 지도 (spec §3.6) — useSearchParams 사용으로 Suspense 경계 필요
export default function MapPage() {
  return (
    <main className="h-full">
      <Suspense>
        <MapView />
      </Suspense>
    </main>
  );
}
