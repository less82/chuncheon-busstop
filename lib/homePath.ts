"use client";

// 홈 탭 복원 (v5): 홈 스택(지도·저장 탭 제외)의 마지막 경로를 기억해
// 하단 홈 탭을 누르면 첫 화면이 아니라 마지막으로 쓰던 화면으로 돌아간다
const KEY = "lastHomePath";

export function saveHomePath(path: string) {
  try {
    sessionStorage.setItem(KEY, path);
  } catch {}
}

export function loadHomePath(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "/";
  } catch {
    return "/";
  }
}
