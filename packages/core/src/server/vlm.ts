import type { ReportCategory, VlmResult } from '../types';

const VALID_CATEGORIES: ReportCategory[] = ['glass', 'light', 'bench', 'bit', 'shade'];

export function isVlmConfigured(): boolean {
  return Boolean(process.env.VLM_API_URL && process.env.VLM_API_KEY);
}

/**
 * 사진 한 장만으로 파손 유형을 자동 분류한다.
 * VLM 미설정 시에는 분류를 비워 두고 관리자 화면에서 확인하도록 넘긴다.
 */
export async function classifyReportPhoto(input: { photoUrl: string | null }): Promise<VlmResult> {
  if (isVlmConfigured() && input.photoUrl) {
    try {
      return await callVlmApi(input.photoUrl);
    } catch (error) {
      console.warn('[vlm] 실패, 미분류로 접수합니다:', (error as Error).message);
    }
  }

  return {
    category: null,
    tags: [],
    summary: '',
    severity: 'medium',
    source: 'mock',
  };
}

async function callVlmApi(photoUrl: string): Promise<VlmResult> {
  const res = await fetch(process.env.VLM_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.VLM_MODEL ?? 'gpt-4o-mini',
      image_url: photoUrl,
      prompt:
        '춘천시 버스정류장 사진의 파손 유형을 glass|light|bench|bit|shade 중 하나로 분류하고, 태그와 severity(low|medium|high), 한 줄 요약을 JSON으로 반환하세요.',
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as Partial<VlmResult>;
  const category = json.category && VALID_CATEGORIES.includes(json.category) ? json.category : null;

  return {
    category,
    tags: json.tags ?? [],
    summary: json.summary ?? '',
    severity: json.severity ?? 'medium',
    source: 'vlm',
  };
}
