// B2G 대시보드 집계 (spec §4.1) — 모든 수치는 원천 데이터에서 직접 계산, 가중치 없음
import "server-only";
import { getAllStops, shelters } from "./stops.server";
import { getSupabase, type ReportRow } from "./supabase.server";
import { distanceM } from "./geo";
import { FAC_KEYS, type FacKey } from "./types";

export interface FacilityBreakdown {
  yes: number;
  no: number;
  unknown: number;
}

export interface GovStats {
  totalStops: number;
  shadeUnknown: number; // 그늘 미확인 정류장 (데이터_근거 근거② 기준, AI 판독 반영)
  heatVulnerable: number; // 폭염 취약: 그늘 없음·미확인 AND 최근접 무더위쉼터 300m 밖
  reportCount: number;
  byFacility: Record<FacKey, FacilityBreakdown>;
  aiResolvedCount: number; // AI 판독으로 미확인→확인 전환된 (정류장, 시설) 수
}

// 정류장별 최근접 무더위쉼터 거리 (모듈 캐시 — 서버 기동 후 1회 계산)
let shelterDistCache: Map<string, number> | null = null;
function nearestShelterDist(): Map<string, number> {
  if (shelterDistCache) return shelterDistCache;
  const m = new Map<string, number>();
  for (const s of getAllStops()) {
    let best = Infinity;
    for (const sh of shelters) {
      if (!sh.operating) continue;
      const d = distanceM(s.lat, s.lng, sh.lat, sh.lng);
      if (d < best) best = d;
    }
    m.set(s.id, best);
  }
  shelterDistCache = m;
  return m;
}

export async function getGovStats(): Promise<GovStats> {
  const stops = getAllStops();

  // 제보 AI 판독을 정류장별로 병합 (오래된 것부터 적용 → 최신이 이김, unknown은 덮지 않음)
  let reports: ReportRow[] = [];
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("reports")
      .select("stop_id, ai_status, ai_facilities, created_at")
      .order("created_at", { ascending: true })
      .limit(1000);
    reports = (data ?? []) as ReportRow[];
  } catch {
    // Supabase 장애 시 정적 데이터만으로 집계
  }

  const aiByStop = new Map<string, Record<string, string>>();
  for (const r of reports) {
    if (r.ai_status !== "done" || !r.ai_facilities) continue;
    const cur = aiByStop.get(r.stop_id) ?? {};
    for (const k of FAC_KEYS) {
      const v = (r.ai_facilities as Record<string, string>)[k];
      if (v === "yes" || v === "no") cur[k] = v;
    }
    aiByStop.set(r.stop_id, cur);
  }

  const byFacility = Object.fromEntries(
    FAC_KEYS.map((k) => [k, { yes: 0, no: 0, unknown: 0 }]),
  ) as Record<FacKey, FacilityBreakdown>;

  let shadeUnknown = 0;
  let heatVulnerable = 0;
  let aiResolvedCount = 0;
  const dists = nearestShelterDist();

  for (const s of stops) {
    const ai = aiByStop.get(s.id);
    const status: Record<FacKey, "yes" | "no" | "unknown"> = {} as never;
    for (const k of FAC_KEYS) {
      const baseSt = s.facilities?.[k]?.status ?? "unknown";
      const aiSt = ai?.[k];
      if (aiSt && baseSt === "unknown") aiResolvedCount++;
      status[k] = (aiSt as "yes" | "no" | undefined) ?? (baseSt as "yes" | "no" | "unknown");
      byFacility[k][status[k]]++;
    }
    if (status.shade === "unknown") shadeUnknown++;
    // 폭염 취약 규칙 (spec §4.1): 그늘 확인 안 됨 AND 대피할 쉼터가 도보권 밖
    if (status.shade !== "yes" && (dists.get(s.id) ?? Infinity) > 300) heatVulnerable++;
  }

  return {
    totalStops: stops.length,
    shadeUnknown,
    heatVulnerable,
    reportCount: reports.length,
    byFacility,
    aiResolvedCount,
  };
}
