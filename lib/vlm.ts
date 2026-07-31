// VLM 사진 판독 (spec §3.5): OpenRouter 경유, 서버 전용.
// ① 수리 민원 분류 + 한 줄 요약  ② 시설 4종(그늘·의자·쉘터·안내기) 유무 판독
import "server-only";

export interface VlmResult {
  category: string; // 파손|고장|노후|청결|기타|해당없음
  summary: string;
  facilities: Record<"shade" | "seat" | "shelter" | "sign", "yes" | "no" | "unknown">;
}

const CATEGORIES = ["파손", "고장", "노후", "청결", "기타", "해당없음"];

const PROMPT = `당신은 버스정류장 사진을 판독하는 시스템입니다. 사진을 보고 JSON만 출력하세요 (다른 텍스트 금지):
{
  "category": "파손|고장|노후|청결|기타|해당없음 중 하나 — 사진 속 수리·민원 거리가 무엇인지. 문제가 안 보이면 해당없음",
  "summary": "민원 요약 한 문장 (한국어, 40자 이내). 문제가 없으면 정류장 상태 한 줄 설명",
  "facilities": {
    "shade": "yes|no|unknown — 그늘(지붕·나무·차양 등)이 있는가",
    "seat": "yes|no|unknown — 앉을 의자·벤치가 있는가",
    "shelter": "yes|no|unknown — 지붕 있는 승강장 구조물(쉘터)이 있는가",
    "sign": "yes|no|unknown — 버스 도착안내 전광판(BIT)이 있는가"
  }
}
사진에서 판단할 수 없는 항목은 unknown으로 두세요. 추측하지 마세요.`;

export async function analyzePhoto(photoUrl: string): Promise<VlmResult> {
  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.VLM_MODEL;
  if (!key || !model) throw new Error("VLM env missing");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30_000), // 실측: 단순 프롬프트 8.4초 → 전체 프롬프트 여유분 포함 30초
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: photoUrl } },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0,
      // 하이브리드 추론 모델의 thinking 비활성화 — 실측: qwen3.6-plus 29s(추론 969토큰) → 5.8s
      reasoning: { enabled: false },
    }),
  });
  if (!res.ok) throw new Error(`VLM ${res.status}`);
  const json = await res.json();
  const text: string = json?.choices?.[0]?.message?.content ?? "";

  // 코드펜스·전후 텍스트에 감싸여 와도 JSON 블록만 추출
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("VLM: no JSON in response");
  const parsed = JSON.parse(m[0]);

  const category = CATEGORIES.includes(parsed.category) ? parsed.category : "기타";
  const norm = (v: unknown): "yes" | "no" | "unknown" =>
    v === "yes" || v === "no" ? v : "unknown";
  return {
    category,
    summary: String(parsed.summary ?? "").slice(0, 80),
    facilities: {
      shade: norm(parsed.facilities?.shade),
      seat: norm(parsed.facilities?.seat),
      shelter: norm(parsed.facilities?.shelter),
      sign: norm(parsed.facilities?.sign),
    },
  };
}
