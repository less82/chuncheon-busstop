import AppHeader from "@/components/AppHeader";
import JourneyFinder from "@/components/JourneyFinder";

// 경로 찾기 (개편): 장소 입력 → 환승 포함 경로 후보 + 정류장 시설 정보
export default function RoutePage() {
  return (
    <>
      <AppHeader title="가는 길 찾기" />
      <main className="px-5 pb-8 pt-4">
        <h1 className="text-[1.25rem] font-black leading-snug">어디로 가시나요?</h1>
        <JourneyFinder />
      </main>
    </>
  );
}
