export type FacilityKey = 'shade' | 'bench' | 'shelter' | 'bit' | 'light';
export type FacilityStatus = 'yes' | 'no' | 'unknown';

export type Facilities = Record<FacilityKey, FacilityStatus>;

export interface Stop {
  id: string;
  name: string;
  alias?: string;
  lat: number;
  lng: number;
  facilities: Facilities;
}

export interface BusRoute {
  id: string;
  routeNo: string;
  routeType: string;
  headsignForward: string;
  headsignBackward: string;
  stopIds: string[];
}

export interface CoolingShelter {
  id: string;
  name: string;
  type: '그늘막' | '무더위쉼터' | '스마트쉼터';
  lat: number;
  lng: number;
  hours: string;
  indoor: boolean;
}

/** TAGO 도착정보 (또는 Mock) */
export interface Arrival {
  routeId: string;
  routeNo: string;
  routeType: string;
  /** 계산된 방면 라벨. 예: "후평동" */
  headsign: string;
  /** 도착까지 남은 초 */
  arrTimeSec: number;
  /** 남은 정류장 수 */
  arrPrevStationCnt: number;
  /** 저상버스 여부 */
  lowPlate: boolean;
  source: 'tago' | 'mock';
}

/** 출발지 → 목적지로부터 자동 산출된 방면 정보 */
export interface DirectionResult {
  routeId: string;
  routeNo: string;
  routeType: string;
  /** 방면 라벨 (종점/주요 경유지 기준) */
  headsign: string;
  /** 진행 방향 */
  bound: 'forward' | 'backward';
  /** 출발지에서 목적지까지 남은 정류장 수 */
  stopCount: number;
  /** 경유 정류장 이름 (출발지 다음 ~ 목적지) */
  viaStopNames: string[];
}

export type ReportCategory = 'glass' | 'light' | 'bench' | 'bit' | 'shade';
export type ReportStatus = 'pending' | 'in_progress' | 'resolved';

export interface Report {
  id: string;
  /** 촬영 좌표에서 자동 매칭한 최근접 정류장 (매칭 실패 시 빈 문자열) */
  stop_id: string;
  stop_name: string;
  /** VLM 자동 분류 결과. 분류 전/실패 시 null */
  category: ReportCategory | null;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  /** 촬영 시각 (사진과 함께 자동 수집) */
  captured_at: string;
  vlm_tags: string[] | null;
  is_urgent: boolean;
  status: ReportStatus;
  created_at: string;
  /** 서버 계산 필드 (DB 컬럼 아님) */
  cluster_size?: number;
}

export interface NewReportInput {
  photo_url: string;
  lat?: number | null;
  lng?: number | null;
  captured_at?: string | null;
}

export interface VlmResult {
  category: ReportCategory | null;
  tags: string[];
  summary: string;
  severity: 'low' | 'medium' | 'high';
  source: 'vlm' | 'mock';
}

export interface DataSourceInfo {
  supabase: boolean;
  tago: boolean;
  vlm: boolean;
}
