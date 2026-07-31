"use client";

// 제보 테이블 (spec §4.2): 정류장 검색 + 분류 필터, 사진 클릭 확대
import { useEffect, useMemo, useState } from "react";
import slimStops from "@/lib/data/stops.slim.json";
import type { SlimStop } from "@/lib/types";
import { FAC_LABEL, type FacKey } from "@/lib/types";

const nameById = new Map((slimStops as SlimStop[]).map((s) => [s.id, s.name]));
const CATEGORIES = ["전체", "파손", "고장", "노후", "청결", "기타", "해당없음"];

interface Report {
  id: string;
  stop_id: string;
  photo_url: string;
  ai_status: string;
  ai_category: string | null;
  ai_summary: string | null;
  ai_facilities: Record<string, string> | null;
  created_at: string;
}

export default function ReportsTable() {
  const [reports, setReports] = useState<Report[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("전체");
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => setReports(d.reports ?? []))
      .catch(() => setReports([]));
  }, []);

  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        const name = nameById.get(r.stop_id) ?? r.stop_id;
        if (q && !name.includes(q)) return false;
        if (cat !== "전체" && r.ai_category !== cat) return false;
        return true;
      }),
    [reports, q, cat],
  );

  return (
    <div className="mt-5">
      <div className="flex gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="정류장 이름 검색"
          className="w-64 rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <p className="ml-auto self-center text-sm text-muted">{filtered.length}건</p>
      </div>

      <table className="mt-4 w-full border-collapse overflow-hidden rounded-2xl bg-white text-sm">
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="px-4 py-3">시각</th>
            <th className="px-4 py-3">정류장</th>
            <th className="px-4 py-3">분류</th>
            <th className="px-4 py-3">요약</th>
            <th className="px-4 py-3">시설 판독</th>
            <th className="px-4 py-3">사진</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} className="border-b border-line/50 align-top">
              <td className="whitespace-nowrap px-4 py-3 text-muted">
                {new Date(r.created_at).toLocaleString("ko-KR", {
                  month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3 font-bold">{nameById.get(r.stop_id) ?? r.stop_id}</td>
              <td className="px-4 py-3">
                {r.ai_status === "done" ? (r.ai_category ?? "-") : r.ai_status === "pending" ? "분류 중" : "실패"}
              </td>
              <td className="px-4 py-3">{r.ai_summary ?? "-"}</td>
              <td className="px-4 py-3 text-xs text-primary">
                {r.ai_facilities
                  ? (Object.entries(r.ai_facilities) as [FacKey, string][])
                      .filter(([, v]) => v === "yes" || v === "no")
                      .map(([k, v]) => `${FAC_LABEL[k]} ${v === "yes" ? "있음" : "없음"}`)
                      .join(" · ") || "-"
                  : "-"}
              </td>
              <td className="px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.photo_url}
                  alt="제보 사진"
                  onClick={() => setZoom(r.photo_url)}
                  className="h-12 w-12 cursor-zoom-in rounded-lg border border-line object-cover"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted">조건에 맞는 제보가 없습니다.</p>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
          onClick={() => setZoom(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="제보 사진 확대" className="max-h-full max-w-full rounded-2xl" />
        </div>
      )}
    </div>
  );
}
