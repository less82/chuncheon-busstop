// 도착 정보 타입 (API 응답 공통)
export interface Arrival {
  routeNo: string; // 노선 번호 (예: "300", "동내2")
  minutes: number; // 남은 분
  stopsAway: number; // 남은 정류장 수
}

export interface ArrivalsResponse {
  arrivals: Arrival[];
  updatedAt: string;
}

// 경로의 후보 노선("12-1·12-S") 중 가장 빨리 오는 실시간 도착 1건.
// TAGO는 기점 번호를 "12"로 주는데 노선 데이터는 지선까지 구분한 "12-1"이라
// 정확히 일치하지 않는다 → 일치 실패 시 하이픈 앞 기본 번호로 다시 맞춘다.
export function pickArrival(arrivals: Arrival[], routeNo: string): Arrival | null {
  const wanted = routeNo.split("·");
  const exact = arrivals.filter((a) => wanted.includes(a.routeNo));
  if (exact.length > 0) return exact[0];
  const bases = new Set(wanted.map((r) => r.split("-")[0]));
  const loose = arrivals.filter((a) => bases.has(a.routeNo.split("-")[0]));
  return loose[0] ?? null;
}
