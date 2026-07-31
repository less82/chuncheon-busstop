import CameraReport from "@/components/CameraReport";

// 민원 탭 (v8.2): 진입 즉시 카메라 → 사진 + [확인]. 정류장·시각은 내부 처리 (spec §3.5)
export default function ReportTabPage() {
  return (
    <main className="px-5 py-6">
      <h1 className="text-[1.25rem] font-black leading-snug">
        불편한 곳을 사진으로
        <br />
        찍어 주세요
      </h1>
      <CameraReport />
    </main>
  );
}
