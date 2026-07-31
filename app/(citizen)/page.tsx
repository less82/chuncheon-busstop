import JourneyFinder from "@/components/JourneyFinder";

// 홈 (v8): 첫 화면 = 가는 길 찾기 ("어디로 가시나요?") — 로고·검색·내 주변 정류장 화면 제거
export default function HomePage() {
  return (
    <main className="px-5 pb-8 pt-6">
      <JourneyFinder />
    </main>
  );
}
