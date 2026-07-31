// 사진 제보 API (spec §3.5·§5)
// POST: 사진 업로드 → reports insert → 응답 후 after()에서 VLM 판독 → 행 업데이트
// GET:  ?stopId= | ?since= 목록 (대시보드 피드·상세 병합용)
import { NextRequest, NextResponse, after } from "next/server";
import { getSupabase, type ReportRow } from "@/lib/supabase.server";
import { getStop } from "@/lib/stops.server";
import { analyzePhoto } from "@/lib/vlm";

export const maxDuration = 60; // VLM after() 작업 시간 확보 (Vercel)

const MAX_SIZE = 8 * 1024 * 1024; // 8MB (폰 카메라 원본 감안)

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const stopId = String(form.get("stopId") ?? "");
  const photo = form.get("photo");

  if (!getStop(stopId)) return NextResponse.json({ error: "unknown stop" }, { status: 404 });
  if (!(photo instanceof File) || photo.size === 0)
    return NextResponse.json({ error: "photo required" }, { status: 400 });
  if (photo.size > MAX_SIZE)
    return NextResponse.json({ error: "photo too large" }, { status: 413 });

  const supabase = getSupabase();

  // 1) Storage 업로드 (경로: stopId/타임스탬프.확장자)
  const ext = (photo.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${stopId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = await photo.arrayBuffer();
  const { error: upErr } = await supabase.storage
    .from("reports")
    .upload(path, buf, { contentType: photo.type || "image/jpeg" });
  if (upErr) return NextResponse.json({ error: `upload: ${upErr.message}` }, { status: 500 });

  const photoUrl = supabase.storage.from("reports").getPublicUrl(path).data.publicUrl;

  // 2) 제보 행 생성 — VLM 성패와 무관하게 제보는 항상 저장 (spec)
  const { data: row, error: insErr } = await supabase
    .from("reports")
    .insert({ stop_id: stopId, photo_url: photoUrl })
    .select()
    .single();
  if (insErr) return NextResponse.json({ error: `insert: ${insErr.message}` }, { status: 500 });

  // 3) 응답 이후 VLM 판독 (시민을 기다리게 하지 않음)
  after(async () => {
    try {
      const result = await analyzePhoto(photoUrl);
      await supabase
        .from("reports")
        .update({
          ai_status: "done",
          ai_category: result.category,
          ai_summary: result.summary,
          ai_facilities: result.facilities,
        })
        .eq("id", row.id);
    } catch (e) {
      console.error("[vlm] failed:", e instanceof Error ? `${e.name}: ${e.message}` : e);
      await supabase.from("reports").update({ ai_status: "failed" }).eq("id", row.id);
    }
  });

  return NextResponse.json({ ok: true, id: row.id });
}

export async function GET(req: NextRequest) {
  const stopId = req.nextUrl.searchParams.get("stopId");
  const since = req.nextUrl.searchParams.get("since");

  const supabase = getSupabase();
  let q = supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (stopId) q = q.eq("stop_id", stopId);
  if (since) q = q.gt("created_at", since);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: (data ?? []) as ReportRow[] });
}
