"use client";

// 실시간 제보 피드 (spec §4.1): 5초 폴링, 새 제보 하이라이트, AI 태그·요약·시설 판독
// 새 제보 감지 시 router.refresh()로 서버 KPI(미확인·제보 수)도 함께 갱신 — 데모 순간
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import slimStops from "@/lib/data/stops.slim.json";
import type { SlimStop } from "@/lib/types";
import { FAC_LABEL, type FacKey } from "@/lib/types";

const nameById = new Map((slimStops as SlimStop[]).map((s) => [s.id, s.name]));

interface Report {
  id: string;
  stop_id: string;
  photo_url: string;
  ai_status: "pending" | "done" | "failed";
  ai_category: string | null;
  ai_summary: string | null;
  ai_facilities: Record<string, string> | null;
  created_at: string;
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "방금 전";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

const CATEGORY_STYLE: Record<string, string> = {
  파손: "bg-warn text-white",
  고장: "bg-warn text-white",
  노후: "bg-warn-soft text-warn",
  청결: "bg-warn-soft text-warn",
  기타: "bg-gray-200 text-muted",
  해당없음: "bg-primary-soft text-primary",
};

export default function LiveFeed() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const knownRef = useRef<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/reports");
        if (!res.ok || !alive) return;
        const { reports: list } = (await res.json()) as { reports: Report[] };
        if (!alive) return;

        const fresh = list.filter((r) => !knownRef.current.has(r.id));
        const statusChanged =
          reports !== null &&
          list.some((r) => {
            const prev = reports.find((p) => p.id === r.id);
            return prev && prev.ai_status !== r.ai_status;
          });

        if (knownRef.current.size > 0 && fresh.length > 0) {
          setNewIds(new Set(fresh.map((r) => r.id)));
          router.refresh(); // 새 제보 → 서버 KPI 재계산
          setTimeout(() => setNewIds(new Set()), 6000);
        } else if (statusChanged) {
          router.refresh(); // AI 판독 완료 → 미확인 카운트 갱신
        }
        for (const r of list) knownRef.current.add(r.id);
        setReports(list);
      } catch {
        // 폴링 실패는 다음 주기에 재시도
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reports === null) return <p className="mt-4 text-sm text-muted">제보를 불러오는 중…</p>;
  if (reports.length === 0)
    return <p className="mt-4 text-sm text-muted">아직 접수된 제보가 없습니다.</p>;

  return (
    <ul className="mt-4 flex max-h-[480px] flex-col gap-3 overflow-y-auto pr-1">
      {reports.map((r) => {
        const facFindings = r.ai_facilities
          ? (Object.entries(r.ai_facilities) as [FacKey, string][])
              .filter(([, v]) => v === "yes" || v === "no")
              .map(([k, v]) => `${FAC_LABEL[k]} ${v === "yes" ? "있음" : "없음"}`)
          : [];
        return (
          <li
            key={r.id}
            className={`flex gap-3 rounded-xl border p-3 transition-all duration-700 ${
              newIds.has(r.id) ? "border-primary bg-primary-soft shadow-md" : "border-line bg-white"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.photo_url}
              alt="제보 사진"
              className="h-16 w-16 shrink-0 rounded-lg border border-line object-cover"
            />
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-bold">{nameById.get(r.stop_id) ?? r.stop_id}</span>
                <span className="ml-2 text-xs text-muted">{timeAgo(r.created_at)}</span>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {r.ai_status === "pending" && (
                  <span className="rounded-md bg-gray-200 px-2 py-0.5 text-xs font-bold text-muted">
                    AI 분류 중…
                  </span>
                )}
                {r.ai_status === "failed" && (
                  <span className="rounded-md bg-gray-200 px-2 py-0.5 text-xs font-bold text-muted">
                    분류 실패 — 원본 확인 필요
                  </span>
                )}
                {r.ai_status === "done" && r.ai_category && (
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-bold ${CATEGORY_STYLE[r.ai_category] ?? "bg-gray-200 text-muted"}`}
                  >
                    {r.ai_category}
                  </span>
                )}
                {r.ai_summary && <span className="text-xs">{r.ai_summary}</span>}
              </div>
              {facFindings.length > 0 && (
                <p className="mt-1 text-xs text-primary">시설 판독: {facFindings.join(" · ")}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
