"use client";

// 하단 텍스트 탭 — 홈 탭은 첫 화면이 아니라 마지막으로 쓰던 홈 스택 화면으로 (v5)
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { loadHomePath } from "@/lib/homePath";

export default function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const isMap = pathname.startsWith("/map");
  const isFav = pathname.startsWith("/favorites");
  const isHome = !isMap && !isFav;

  const cls = (active: boolean) =>
    `flex min-h-14 w-full items-center justify-center text-[0.95rem] font-bold ${
      active ? "text-primary" : "text-muted"
    }`;

  return (
    <nav className="shrink-0 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:pb-0">
      <div className="grid grid-cols-3">
        <button type="button" onClick={() => router.push(loadHomePath())} className={cls(isHome)}>
          홈
        </button>
        <Link href="/map" className={cls(isMap)}>
          지도
        </Link>
        <Link href="/favorites" className={cls(isFav)}>
          저장
        </Link>
      </div>
    </nav>
  );
}
