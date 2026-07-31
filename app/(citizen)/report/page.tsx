import CameraReport from "@/components/CameraReport";

// 민원 탭 (v8.3): 사진 한 장 + 확인 — 문구·버튼은 CameraReport가 전담 (하단 고정 버튼 레이아웃)
export default function ReportTabPage() {
  return (
    <main className="flex h-full flex-col px-5 pb-4 pt-6">
      <CameraReport />
    </main>
  );
}
