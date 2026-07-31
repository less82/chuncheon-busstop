import type { FacilityKey, ReportCategory } from './types';

/** 춘천시 전체 버스정류장 수 (2024 기준 공공데이터) */
export const TOTAL_STOPS_IN_CITY = 1889;

/** 정류장 주변 쿨링쉘터 탐색 반경(m) */
export const SHELTER_RADIUS_M = 30;

/** 동일 이슈 군집 판정 반경(m) — 초과 시 긴급 승격 */
export const CLUSTER_RADIUS_M = 20;

/** 군집 긴급 승격 임계 건수 */
export const CLUSTER_URGENT_THRESHOLD = 3;

/** 관리자 라이브 피드 폴링 주기(ms) */
export const ADMIN_POLL_INTERVAL_MS = 5000;

export const FACILITY_LABELS: Record<FacilityKey, string> = {
  shade: '그늘',
  bench: '의자',
  shelter: '쉘터',
  bit: '전광판',
  light: '조명',
};

export const FACILITY_ORDER: FacilityKey[] = ['shade', 'bench', 'shelter', 'bit', 'light'];

/** 사진 분류(VLM) 결과 라벨 — 시민은 유형을 직접 고르지 않는다 */
export const REPORT_CATEGORIES: {
  key: ReportCategory;
  label: string;
  adminLabel: string;
}[] = [
  { key: 'glass', label: '유리창 파손', adminLabel: '쉘터 유리 파손' },
  { key: 'light', label: '가로등 꺼짐', adminLabel: '조명 소등' },
  { key: 'bench', label: '의자 고장', adminLabel: '벤치 파손' },
  { key: 'bit', label: '전광판 고장', adminLabel: 'BIT 장애' },
  { key: 'shade', label: '그늘막 파손', adminLabel: '그늘막 파손' },
];

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = REPORT_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.label }),
  {} as Record<ReportCategory, string>,
);

/** 분류 전 제보 표시 라벨 */
export const UNCLASSIFIED_LABEL = '분류 대기';

export function reportCategoryLabel(category: ReportCategory | null): string {
  return category ? REPORT_CATEGORY_LABELS[category] : UNCLASSIFIED_LABEL;
}

export const REPORT_STATUS_LABELS = {
  pending: '접수됨',
  in_progress: '처리중',
  resolved: '수리완료',
} as const;
