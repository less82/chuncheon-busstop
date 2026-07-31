import { redirect } from "next/navigation";

// v7: 추천 경로 페이지 폐지 — 가는 길 찾기(/route) 안에서 추천 카드 1개로 대체.
// 기존 세션의 홈 스택이 이 경로를 가리킬 수 있어 리다이렉트만 남긴다.
export default function RouteResultsPage() {
  redirect("/route");
}
