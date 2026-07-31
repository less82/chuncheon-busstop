import { redirect } from "next/navigation";

// v8: 가는 길 찾기가 홈(/)이 됨 — 기존 링크·홈 스택 호환용 리다이렉트만 유지
export default function RoutePage() {
  redirect("/");
}
