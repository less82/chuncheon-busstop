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
