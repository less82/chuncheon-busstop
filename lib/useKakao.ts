"use client";

// 카카오맵 SDK 준비 대기 훅 — SDK 스크립트는 (citizen) 레이아웃의 KakaoLoader가 1회 로드
import { useEffect, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    kakao: any;
  }
}

export function useKakaoReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const check = () => {
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => alive && setReady(true));
        return true;
      }
      return false;
    };
    if (check()) return;
    const t = setInterval(() => {
      if (check()) clearInterval(t);
    }, 200);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return ready;
}
