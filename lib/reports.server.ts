// 제보 AI 판독 결과를 정류장 시설 상태에 병합 (spec §3.5: 출처 우선순위 AI 판독 > 조사 > 공공DB)
import "server-only";
import { getSupabase, type ReportRow } from "./supabase.server";
import type { FullStop } from "./types";
import { FAC_KEYS } from "./types";

// 최신 done 제보들의 ai_facilities를 겹쳐서 시설 코드 문자열(y/n/u × 5) 생성
export async function facilityCodesWithReports(stop: FullStop): Promise<{
  fac: string;
  aiApplied: boolean;
}> {
  // 기본: stops.json 상태
  const base = FAC_KEYS.map((k) => {
    const st = stop.facilities?.[k]?.status;
    return st === "yes" ? "y" : st === "no" ? "n" : "u";
  });

  let aiApplied = false;
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("reports")
      .select("ai_facilities, created_at")
      .eq("stop_id", stop.id)
      .eq("ai_status", "done")
      .not("ai_facilities", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);

    // 오래된 것부터 겹쳐서 최신 판독이 이김. unknown은 덮어쓰지 않음 (모르는 건 모른다고 둠)
    for (const row of (data ?? [] as ReportRow[]).reverse()) {
      const f = row.ai_facilities as Record<string, string> | null;
      if (!f) continue;
      FAC_KEYS.forEach((k, i) => {
        if (f[k] === "yes") { base[i] = "y"; aiApplied = true; }
        else if (f[k] === "no") { base[i] = "n"; aiApplied = true; }
      });
    }
  } catch {
    // Supabase 미설정·장애 시 기본 상태 그대로 (제보 병합만 생략)
  }

  return { fac: base.join(""), aiApplied };
}
