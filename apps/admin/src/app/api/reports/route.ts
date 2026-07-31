import { NextResponse } from 'next/server';
import { updateReport } from '@ccbs/core/server';
import type { ReportCategory, ReportStatus } from '@ccbs/core';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: ReportStatus[] = ['pending', 'in_progress', 'resolved'];
const VALID_CATEGORIES: ReportCategory[] = ['glass', 'light', 'bench', 'bit', 'shade'];

/** 제보 상태·분류 변경 — 관리자 전용 */
export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    status?: ReportStatus;
    category?: ReportCategory | null;
    is_urgent?: boolean;
  };

  if (!body.id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: '유효하지 않은 status입니다.' }, { status: 400 });
  }
  if (body.category && !VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: '유효하지 않은 category입니다.' }, { status: 400 });
  }

  const report = await updateReport(body.id, {
    status: body.status,
    category: body.category,
    is_urgent: body.is_urgent,
  });

  if (!report) {
    return NextResponse.json({ error: '제보를 찾을 수 없습니다.' }, { status: 404 });
  }
  return NextResponse.json({ report });
}
