import AppHeader from "@/components/AppHeader";
import JourneyResults from "@/components/JourneyResults";

// 추천 경로 페이지 (v5): 최소 시간 2개
export default function RouteResultsPage() {
  return (
    <>
      <AppHeader title="추천 경로" />
      <main className="px-5 pb-8 pt-4">
        <JourneyResults />
      </main>
    </>
  );
}
