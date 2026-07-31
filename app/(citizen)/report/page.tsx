import NearbyReport from "@/components/NearbyReport";

// 민원 탭 (v8.1): 가까운 정류장 선택 → 사진 한 장 제보 (spec §3.5)
export default function ReportTabPage() {
  return (
    <main className="px-5 py-6">
      <h1 className="text-[1.25rem] font-black leading-snug">
        불편한 곳을 사진으로
        <br />
        찍어 주세요
      </h1>
      <p className="mt-2 text-[0.9rem] font-bold text-muted">어느 정류장인가요?</p>
      <NearbyReport />
    </main>
  );
}
