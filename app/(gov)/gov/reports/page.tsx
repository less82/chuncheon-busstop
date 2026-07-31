import ReportsTable from "@/components/gov/ReportsTable";

// 시민 제보 목록 (spec §4.2) — 조회 전용
export default function GovReportsPage() {
  return (
    <main>
      <h1 className="text-xl font-black">시민 제보</h1>
      <p className="mt-1 text-sm text-muted">
        접수된 사진 제보와 AI 분류 결과 (처리 상태 관리는 향후 계획)
      </p>
      <ReportsTable />
    </main>
  );
}
