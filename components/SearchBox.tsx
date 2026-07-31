"use client";

// 대형 검색창 + 음성 버튼 (spec §3.1) — 제출 시 /search?q= 로 이동
import { useRouter } from "next/navigation";
import { useState } from "react";
import VoiceButton from "./VoiceButton";

export default function SearchBox({
  initialQuery = "",
  autoFocus = false,
}: {
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  const go = (text: string) => {
    const t = text.trim();
    if (t) router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
      className="flex items-stretch gap-2"
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="정류장 이름을 찾아보세요"
        autoFocus={autoFocus}
        enterKeyHint="search"
        className="min-h-14 w-full rounded-xl border-2 border-line bg-white px-4 text-[1rem] outline-none focus:border-primary"
      />
      <VoiceButton onResult={go} />
    </form>
  );
}
