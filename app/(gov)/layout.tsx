import Link from "next/link";

// B2G 데스크톱 레이아웃: 좌측 사이드바 (spec §4)
export default function GovLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh min-w-[1024px] bg-bg text-[16px]">
      <aside className="w-56 shrink-0 border-r border-line bg-white px-4 py-6">
        <p className="text-lg font-black text-primary">쉼표정류장</p>
        <p className="mt-1 text-xs text-muted">춘천시 정류장 관리 대시보드</p>
        <nav className="mt-8 flex flex-col gap-1">
          <Link href="/gov" className="rounded-lg px-3 py-2.5 font-bold hover:bg-primary-soft">
            시설 현황
          </Link>
          <Link href="/gov/reports" className="rounded-lg px-3 py-2.5 font-bold hover:bg-primary-soft">
            시민 제보
          </Link>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 px-8 py-6">{children}</div>
    </div>
  );
}
