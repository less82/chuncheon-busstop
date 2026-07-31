import Link from "next/link";
import SearchBox from "@/components/SearchBox";

// 홈 (spec §3.1): 로고·소개·검색창·카드 2개·탭이 전부 — 어르신 우선, 여백 중심
export default function HomePage() {
  return (
    <main className="flex min-h-full flex-col justify-center gap-8 px-5 py-10">
      <div className="text-center">
        <h1 className="text-4xl font-black text-primary">쉼표정류장</h1>
        <p className="mt-3 text-[1.05rem] leading-relaxed text-muted">
          시원하게 기다릴 정류장을
          <br />
          찾아드립니다
        </p>
      </div>

      <SearchBox />

      <div className="flex flex-col gap-3">
        <Link
          href="/search?near=1"
          className="rounded-2xl bg-primary py-5 text-center text-[1.1rem] font-bold text-white active:opacity-90"
        >
          내 주변 정류장 보기
        </Link>
        <Link
          href="/route"
          className="rounded-2xl border-2 border-primary bg-white py-5 text-center text-[1.1rem] font-bold text-primary active:bg-primary-soft"
        >
          어느 쪽에서 타야 하나요?
        </Link>
      </div>
    </main>
  );
}
