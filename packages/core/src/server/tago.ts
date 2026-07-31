import { ROUTES, getStop } from '../data';
import type { Arrival, BusRoute } from '../types';

const TAGO_ENDPOINT =
  'http://apis.data.go.kr/1613000/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList';

export function isTagoConfigured(): boolean {
  return Boolean(process.env.TAGO_SERVICE_KEY);
}

/**
 * 정류장 도착 예정 정보 조회.
 * TAGO 키가 없거나 호출이 실패하면 즉시 Mock 데이터로 폴백해
 * 앱이 외부 의존성 없이 단독 동작하도록 보장한다.
 */
export async function getArrivals(stopId: string): Promise<Arrival[]> {
  if (isTagoConfigured()) {
    try {
      const arrivals = await fetchTagoArrivals(stopId);
      if (arrivals.length > 0) return arrivals;
    } catch (error) {
      console.warn('[tago] 실패, Mock으로 폴백합니다:', (error as Error).message);
    }
  }
  return mockArrivals(stopId);
}

async function fetchTagoArrivals(stopId: string): Promise<Arrival[]> {
  const params = new URLSearchParams({
    serviceKey: decodeURIComponent(process.env.TAGO_SERVICE_KEY ?? ''),
    cityCode: process.env.TAGO_CITY_CODE ?? '32010',
    nodeId: stopId,
    numOfRows: '20',
    pageNo: '1',
    _type: 'json',
  });

  // next.revalidate 는 Next.js가 확장한 fetch 옵션이라 core 단독 타입체크에서는 알 수 없다.
  const init: RequestInit & { next?: { revalidate: number } } = { next: { revalidate: 15 } };
  const res = await fetch(`${TAGO_ENDPOINT}?${params.toString()}`, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = (await res.json()) as TagoResponse;
  const items = json?.response?.body?.items?.item;
  if (!items) return [];

  const list = Array.isArray(items) ? items : [items];
  return list.map((item) => ({
    routeId: String(item.routeid ?? ''),
    routeNo: String(item.routeno ?? ''),
    routeType: String(item.routetp ?? '일반'),
    headsign: resolveHeadsignFromSeed(String(item.routeno ?? ''), stopId),
    arrTimeSec: Number(item.arrtime ?? 0),
    arrPrevStationCnt: Number(item.arrprevstationcnt ?? 0),
    lowPlate: String(item.vehicletp ?? '').includes('저상'),
    source: 'tago' as const,
  }));
}

/** 노선번호 + 현재 정류장으로 방면 라벨 추정 (TAGO 응답에는 방면 정보가 없음) */
function resolveHeadsignFromSeed(routeNo: string, stopId: string): string {
  const route = ROUTES.find((r) => r.routeNo === routeNo);
  if (!route) return '';
  return headsignAtStop(route, stopId);
}

function headsignAtStop(route: BusRoute, stopId: string): string {
  const idx = route.stopIds.indexOf(stopId);
  if (idx === -1) return route.headsignForward;
  return idx === route.stopIds.length - 1 ? route.headsignBackward : route.headsignForward;
}

/**
 * Mock 도착정보.
 * 정류장 ID와 분(minute) 단위 시간을 시드로 사용해
 * 새로고침해도 값이 자연스럽게 감소하는 것처럼 보이도록 만든다.
 */
export function mockArrivals(stopId: string): Arrival[] {
  const stop = getStop(stopId);
  if (!stop) return [];

  const routesHere = ROUTES.filter((r) => r.stopIds.includes(stopId));
  const seedBase = hash(stopId) + Math.floor(Date.now() / 60_000);

  const arrivals: Arrival[] = [];

  routesHere.forEach((route, i) => {
    const idx = route.stopIds.indexOf(stopId);
    const bounds: ('forward' | 'backward')[] =
      idx === 0 ? ['forward'] : idx === route.stopIds.length - 1 ? ['backward'] : ['forward', 'backward'];

    bounds.forEach((bound, j) => {
      const seed = seedBase + i * 31 + j * 17;
      const minutes = 1 + (seed % 22);
      const seconds = (seed * 7) % 60;
      arrivals.push({
        routeId: route.id,
        routeNo: route.routeNo,
        routeType: route.routeType,
        headsign: bound === 'forward' ? route.headsignForward : route.headsignBackward,
        arrTimeSec: minutes * 60 + seconds,
        arrPrevStationCnt: 1 + (seed % 9),
        lowPlate: seed % 3 === 0,
        source: 'mock',
      });
    });
  });

  return arrivals.sort((a, b) => a.arrTimeSec - b.arrTimeSec);
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) % 100_000;
  }
  return h;
}

interface TagoResponse {
  response?: {
    body?: {
      items?: {
        item?: TagoItem | TagoItem[];
      };
    };
  };
}

interface TagoItem {
  routeid?: string;
  routeno?: string | number;
  routetp?: string;
  arrtime?: string | number;
  arrprevstationcnt?: string | number;
  vehicletp?: string;
}
