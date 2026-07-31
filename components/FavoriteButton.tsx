"use client";

// 저장(즐겨찾기) 토글 — localStorage "favStops" (spec §3.4/3.7)
import { useEffect, useState } from "react";

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem("favStops") ?? "[]");
  } catch {
    return [];
  }
}

export default function FavoriteButton({ stopId }: { stopId: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(read().includes(stopId)), [stopId]);

  const toggle = () => {
    const ids = read();
    const next = ids.includes(stopId) ? ids.filter((i) => i !== stopId) : [...ids, stopId];
    localStorage.setItem("favStops", JSON.stringify(next));
    setSaved(next.includes(stopId));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`ml-auto min-h-11 shrink-0 rounded-xl border-2 px-3 text-[0.85rem] font-bold ${
        saved ? "border-primary bg-primary text-white" : "border-line bg-white text-muted"
      }`}
    >
      {saved ? "저장됨" : "저장"}
    </button>
  );
}
