"use client";

// 경로 상태 공유 (개편 §2): 홈 탭(/route)에서 만든 후보·선택을 지도 탭이 읽는다.
// sessionStorage — 탭(브라우저 세션) 동안 유지, 닫으면 초기화. 홈에서 경로를 만들지 않으면 지도에 경로 없음.
import type { JourneyState } from "./journey";

const KEY = "journeyState";

export function saveJourneyState(s: JourneyState | null) {
  try {
    if (s === null) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event("journey-change"));
  } catch {}
}

export function loadJourneyState(): JourneyState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as JourneyState) : null;
  } catch {
    return null;
  }
}
