// Supabase 서버 클라이언트 (API 라우트 전용)
// SUPABASE_SECRET_KEY(sb_secret_)가 있으면 우선 사용 — RLS 우회로 storage 정책 불필요.
// 없으면 publishable 키 폴백 (RLS 정책 필요).
import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabase() {
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface ReportRow {
  id: string;
  stop_id: string;
  photo_url: string;
  ai_status: "pending" | "done" | "failed";
  ai_category: string | null;
  ai_summary: string | null;
  ai_facilities: Record<string, "yes" | "no" | "unknown"> | null;
  created_at: string;
}
