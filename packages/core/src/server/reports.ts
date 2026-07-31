import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CLUSTER_RADIUS_M, CLUSTER_URGENT_THRESHOLD, TOTAL_STOPS_IN_CITY } from '../constants';
import { STOPS, getStop, nearestStopTo } from '../data';
import { distanceMeters } from '../geo';
import { classifyReportPhoto } from './vlm';
import { loadUpload, mutateReports, readReports, saveUpload } from './store';
import type { NewReportInput, Report, ReportStatus } from '../types';

let supabase: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return supabase;
}

/* ───────────────────── Clustering ───────────────────── */

/** 제보 좌표 — 사진 GPS 우선, 없으면 매칭된 정류장 좌표 */
function reportPoint(report: Report): { lat: number; lng: number } | null {
  if (report.lat != null && report.lng != null) return { lat: report.lat, lng: report.lng };
  const stop = getStop(report.stop_id);
  return stop ? { lat: stop.lat, lng: stop.lng } : null;
}

/**
 * GPS 20m 이내 동일 유형 미해결 제보가 임계 건수 이상이면 긴급으로 승격.
 */
export function applyUrgency(reports: Report[]): Report[] {
  const open = reports.filter((r) => r.status !== 'resolved');

  return reports.map((report) => {
    const point = reportPoint(report);
    if (!point || report.status === 'resolved') {
      return { ...report, cluster_size: 1 };
    }

    const cluster = open.filter((other) => {
      if (other.category !== report.category) return false;
      const otherPoint = reportPoint(other);
      if (!otherPoint) return false;
      return distanceMeters(point, otherPoint) <= CLUSTER_RADIUS_M;
    });

    return {
      ...report,
      is_urgent: report.is_urgent || cluster.length >= CLUSTER_URGENT_THRESHOLD,
      cluster_size: cluster.length,
    };
  });
}

/* ───────────────────── Public API ───────────────────── */

export async function listReports(options?: {
  status?: ReportStatus | 'all';
  stopId?: string;
  limit?: number;
}): Promise<Report[]> {
  const client = getSupabase();
  if (client) {
    try {
      let query = client.from('reports').select('*').order('created_at', { ascending: false });
      if (options?.status && options.status !== 'all') query = query.eq('status', options.status);
      if (options?.stopId) query = query.eq('stop_id', options.stopId);
      if (options?.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      if (error) throw error;
      return applyUrgency((data ?? []) as Report[]);
    } catch (error) {
      console.warn('[supabase] listReports 실패, 로컬 저장소로 폴백:', (error as Error).message);
    }
  }

  let rows = readReports();
  if (options?.status && options.status !== 'all') {
    rows = rows.filter((r) => r.status === options.status);
  }
  if (options?.stopId) rows = rows.filter((r) => r.stop_id === options.stopId);
  rows.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  if (options?.limit) rows = rows.slice(0, options.limit);
  return applyUrgency(rows);
}

export async function createReport(input: NewReportInput): Promise<Report> {
  const vlm = await classifyReportPhoto({ photoUrl: input.photo_url });

  const point =
    input.lat != null && input.lng != null ? { lat: input.lat, lng: input.lng } : null;
  const matchedStop = point ? nearestStopTo(point) : null;

  const draft: Report = {
    id: crypto.randomUUID(),
    stop_id: matchedStop?.id ?? '',
    stop_name: matchedStop?.name ?? '위치 미확인',
    category: vlm.category,
    photo_url: input.photo_url,
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    captured_at: input.captured_at ?? new Date().toISOString(),
    vlm_tags: vlm.tags,
    is_urgent: vlm.severity === 'high',
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client.from('reports').insert(draft).select().single();
      if (error) throw error;
      const inserted = data as Report;
      const all = applyUrgency(await listReports({ limit: 200 }));
      const enriched = all.find((r) => r.id === inserted.id) ?? inserted;
      if (enriched.is_urgent && !inserted.is_urgent) {
        await client.from('reports').update({ is_urgent: true }).eq('id', inserted.id);
      }
      return enriched;
    } catch (error) {
      console.warn('[supabase] createReport 실패, 로컬 저장소로 폴백:', (error as Error).message);
    }
  }

  const next = mutateReports((current) => applyUrgency([draft, ...current]));
  return next.find((r) => r.id === draft.id) ?? draft;
}

export async function updateReport(
  id: string,
  patch: Partial<Pick<Report, 'status' | 'is_urgent' | 'vlm_tags' | 'category'>>,
): Promise<Report | null> {
  const cleaned = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  ) as typeof patch;

  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('reports')
        .update(cleaned)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Report;
    } catch (error) {
      console.warn('[supabase] updateReport 실패, 로컬 저장소로 폴백:', (error as Error).message);
    }
  }

  let updated: Report | null = null;
  mutateReports((current) =>
    current.map((report) => {
      if (report.id !== id) return report;
      updated = { ...report, ...cleaned };
      return updated;
    }),
  );
  return updated;
}

export async function getReport(id: string): Promise<Report | null> {
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client.from('reports').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Report;
    } catch (error) {
      console.warn('[supabase] getReport 실패, 로컬 저장소로 폴백:', (error as Error).message);
    }
  }
  return readReports().find((r) => r.id === id) ?? null;
}

/**
 * 사진 업로드. Supabase Storage가 없으면 두 앱이 공유하는 로컬 디렉터리에 저장하고,
 * 각 앱의 /api/photos/[key] 가 같은 파일을 서빙한다.
 */
export async function uploadPhoto(
  file: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const client = getSupabase();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'report-photos';
  const key = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  if (client) {
    try {
      const { error } = await client.storage.from(bucket).upload(key, file, {
        contentType,
        upsert: false,
      });
      if (error) throw error;
      const { data } = client.storage.from(bucket).getPublicUrl(key);
      return data.publicUrl;
    } catch (error) {
      console.warn('[supabase] uploadPhoto 실패, 로컬 저장소로 폴백:', (error as Error).message);
    }
  }

  saveUpload(file, key);
  return `/api/photos/${encodeURIComponent(key)}`;
}

export function getLocalPhoto(key: string): Buffer | null {
  return loadUpload(key);
}

export async function getKpis() {
  const reports = await listReports();
  const unverified = STOPS.filter((s) =>
    Object.values(s.facilities).some((v) => v === 'unknown'),
  ).length;

  return {
    totalStops: TOTAL_STOPS_IN_CITY,
    seededStops: STOPS.length,
    unverifiedFacilities: unverified,
    totalReports: reports.length,
    urgentIssues: reports.filter((r) => r.is_urgent && r.status !== 'resolved').length,
    pending: reports.filter((r) => r.status === 'pending').length,
    inProgress: reports.filter((r) => r.status === 'in_progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  };
}

export function dataSources() {
  return {
    supabase: isSupabaseConfigured(),
    tago: Boolean(process.env.TAGO_SERVICE_KEY),
    vlm: Boolean(process.env.VLM_API_URL && process.env.VLM_API_KEY),
  };
}
