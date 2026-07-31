// 시설 5종 상태 코드: y=있음, n=없음, u=미확인
export type FacStatus = "y" | "n" | "u";

// 시설 순서 고정: 지붕(그늘), 의자, 쉘터, 도착안내기, 조명 (slim 인덱스의 fac 문자열 순서와 동일)
export const FAC_KEYS = ["shade", "seat", "shelter", "sign", "light"] as const;
export type FacKey = (typeof FAC_KEYS)[number];

export const FAC_LABEL: Record<FacKey, string> = {
  shade: "지붕",
  seat: "의자",
  shelter: "쉘터",
  sign: "안내기",
  light: "조명",
};

// 클라이언트 검색용 슬림 정류장 (lib/data/stops.slim.json)
export interface SlimStop {
  id: string; // 관리번호
  no: string; // 정류장번호 (모바일 서비스 번호)
  name: string;
  lat: number;
  lng: number;
  fac: string; // 5글자 상태 코드, FAC_KEYS 순서
  nr: number; // 경유 노선 수
}

// 전체 정류장 (서버 전용, lib/data/stops.json)
export interface FullStop {
  id: string;
  stopNo: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
  facilities: Record<string, { status: "yes" | "no" | "unknown"; source: string }>;
  demand?: {
    byHour: number[];
    total: number;
    aggregatedBidirectional?: boolean;
    matchedName?: string;
  };
}

export interface Shelter {
  name: string;
  operating: boolean;
  dong: string | null;
  addr: string | null;
  kind: string | null;
  days: string | null;
  start: string; // 운영 시작 시각 HHMM ("0900")
  end: string; // 운영 종료 시각 HHMM ("2400" = 자정, end <= start 면 자정 넘겨 운영)
  lat: number;
  lng: number;
}

export interface CoolingFacility {
  kind: string; // 그늘막(고정형) | 그늘막(스마트형) | 물안개분사장치(쿨링포그)
  name: string | null;
  lat: number;
  lng: number;
}
