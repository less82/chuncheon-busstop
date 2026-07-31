"use client";

// 홈 스택 관리 (v5.1): 브라우저 히스토리 대신 자체 스택 —
// 지도·저장 탭을 다녀와도 홈 스택의 뒤로가기 순서가 오염되지 않는다
const LAST_KEY = "lastHomePath";
const STACK_KEY = "homeStack";

function loadStack(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(STACK_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveStack(stack: string[]) {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-20)));
  } catch {}
}

// 홈 스택 경로 방문 기록 (HomePathTracker가 호출)
export function trackHomePath(path: string) {
  try {
    sessionStorage.setItem(LAST_KEY, path);
  } catch {}
  const stack = loadStack();
  const top = stack[stack.length - 1];
  if (top === path) return; // 같은 화면 (쿼리 갱신 등으로 재기록 방지)
  if (stack.length >= 2 && stack[stack.length - 2] === path) {
    stack.pop(); // 뒤로 이동으로 돌아온 경우 — 스택 되감기
  } else {
    stack.push(path);
  }
  saveStack(stack);
}

// 하단 홈 탭: 마지막으로 쓰던 홈 화면
export function loadHomePath(): string {
  try {
    return sessionStorage.getItem(LAST_KEY) ?? "/";
  } catch {
    return "/";
  }
}

// 상단 ← 뒤로: 홈 스택 기준 이전 화면 (현재 화면이 스택 밖이면 스택 최상단으로)
export function homeBackTarget(currentPathname: string): string {
  const stack = loadStack();
  const top = stack[stack.length - 1];
  if (top === undefined) return "/";
  if (top.split("?")[0] !== currentPathname) return top; // 저장 탭 등 스택 밖 화면에서의 뒤로
  stack.pop();
  saveStack(stack);
  return stack[stack.length - 1] ?? "/";
}
