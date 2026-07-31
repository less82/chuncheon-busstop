import fs from 'node:fs';
import path from 'node:path';
import type { Report } from '../types';

/**
 * 시민 앱과 관리자 콘솔은 서로 다른 프로세스(포트)로 뜨기 때문에
 * 인메모리 저장소를 공유할 수 없다. Supabase 미설정 환경에서도
 * 두 앱이 같은 데이터를 보도록 로컬 파일을 공유 저장소로 사용한다.
 */

function dataDir(): string {
  const configured = process.env.CCBS_DATA_DIR;
  // 기본값: 각 앱의 cwd(apps/*)에서 두 단계 위 = 저장소 루트
  const dir = configured
    ? path.resolve(configured)
    : path.resolve(process.cwd(), '..', '..', '.data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function reportsFile(): string {
  return path.join(dataDir(), 'reports.json');
}

export function uploadsDir(): string {
  const dir = path.join(dataDir(), 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readReports(): Report[] {
  const file = reportsFile();
  if (!fs.existsSync(file)) {
    const seeded = seedReports();
    writeReports(seeded);
    return seeded;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Report[];
  } catch {
    return [];
  }
}

export function writeReports(reports: Report[]): void {
  const file = reportsFile();
  // 두 프로세스의 동시 쓰기에서 파일이 반쯤 쓰인 상태로 읽히지 않도록 원자적 교체
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(reports, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

/** 읽기 → 변형 → 쓰기를 한 번에 (다른 프로세스의 최신 상태를 반영) */
export function mutateReports(mutator: (current: Report[]) => Report[]): Report[] {
  const next = mutator(readReports());
  writeReports(next);
  return next;
}

export function saveUpload(buffer: Buffer, key: string): void {
  fs.writeFileSync(path.join(uploadsDir(), key), buffer);
}

export function loadUpload(key: string): Buffer | null {
  // 경로 탈출 방지
  const safe = path.basename(key);
  const file = path.join(uploadsDir(), safe);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file);
}

function seedReports(): Report[] {
  const now = Date.now();
  const base = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

  const seed = (
    id: string,
    stopId: string,
    stopName: string,
    category: Report['category'],
    tags: string[],
    status: Report['status'],
    isUrgent: boolean,
    minutesAgo: number,
  ): Report => ({
    id,
    stop_id: stopId,
    stop_name: stopName,
    category,
    photo_url: null,
    lat: null,
    lng: null,
    captured_at: base(minutesAgo),
    vlm_tags: tags,
    is_urgent: isUrgent,
    status,
    created_at: base(minutesAgo),
  });

  return [
    seed('seed-1', 'CC008', '후평동주공아파트', 'shade', ['그늘막파손', '폭염위험'], 'pending', true, 12),
    seed('seed-2', 'CC005', '명동입구', 'bench', ['벤치파손'], 'in_progress', false, 45),
    seed('seed-3', 'CC012', '온의동현대아파트', 'light', ['조명소등', '야간위험'], 'pending', false, 120),
    seed('seed-4', 'CC016', '우두동입구', 'glass', ['유리파손', '안전위험'], 'pending', true, 8),
    seed('seed-5', 'CC004', '중앙로터리', 'bit', ['BIT장애'], 'resolved', false, 26 * 60),
    seed('seed-6', 'CC008', '후평동주공아파트', 'shade', ['그늘막파손', '폭염위험'], 'pending', true, 6),
    seed('seed-7', 'CC008', '후평동주공아파트', null, [], 'pending', false, 3),
  ];
}
