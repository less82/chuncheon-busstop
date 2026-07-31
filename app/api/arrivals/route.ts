// TAGO 도착정보 프록시 (spec §5). 키는 서버 전용, 캐시 10초.
// 목업 없음 — 장애 시 정직하게 실패를 반환하고 클라이언트가 안내 문구를 보여준다 (팀 결정).
// 검증 완료(7/31): cityCode=32010, nodeId="CCB"+관리번호
import { NextRequest, NextResponse } from "next/server";
import { getStop } from "@/lib/stops.server";
import type { Arrival, ArrivalsResponse } from "@/lib/arrivals";

const CITY_CODE = 32010;
const BASE =
  "http://apis.data.go.kr/1613000/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList";

// 인메모리 캐시 (10초) — 같은 정류장 폴링 부하 방지
const cache = new Map<string, { at: number; data: ArrivalsResponse }>();
const TTL = 10_000;

interface TagoItem {
  routeno?: string | number;
  arrtime?: number; // 초
  arrprevstationcnt?: number;
}

async function fetchTago(stopId: string): Promise<Arrival[]> {
  const key = process.env.TAGO_SERVICE_KEY;
  if (!key) throw new Error("TAGO_SERVICE_KEY missing");
  const url = `${BASE}?serviceKey=${encodeURIComponent(key)}&cityCode=${CITY_CODE}&nodeId=CCB${stopId}&numOfRows=30&_type=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!res.ok) throw new Error(`TAGO ${res.status}`);
  const json = await res.json();
  const raw = json?.response?.body?.items?.item;
  let items: TagoItem[] = [];
  if (Array.isArray(raw)) items = raw;
  else if (raw) items = [raw];
  return items
    .map((it) => ({
      routeNo: String(it.routeno ?? "").replace(/\(.*\)$/, ""),
      minutes: Math.max(1, Math.round((it.arrtime ?? 60) / 60)),
      stopsAway: it.arrprevstationcnt ?? 0,
    }))
    .filter((a) => a.routeNo)
    .sort((a, b) => a.minutes - b.minutes)
    .slice(0, 8);
}

export async function GET(req: NextRequest) {
  const stopId = req.nextUrl.searchParams.get("stopId");
  if (!stopId) return NextResponse.json({ error: "stopId required" }, { status: 400 });
  if (!getStop(stopId)) return NextResponse.json({ error: "unknown stop" }, { status: 404 });

  const hit = cache.get(stopId);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.data);

  try {
    const arrivals = await fetchTago(stopId);
    const data: ArrivalsResponse = { arrivals, updatedAt: new Date().toISOString() };
    cache.set(stopId, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    // 목업으로 대체하지 않음 — 클라이언트가 "불러오지 못했어요"를 표시
    return NextResponse.json({ error: "tago unavailable" }, { status: 502 });
  }
}
