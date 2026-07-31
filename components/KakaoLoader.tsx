"use client";

// 카카오맵 SDK 로더 (지도 + services 장소검색) — citizen 레이아웃에서 1회
import Script from "next/script";

const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

export default function KakaoLoader() {
  if (!KEY) return null;
  return (
    <Script
      src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false&libraries=services`}
      strategy="afterInteractive"
    />
  );
}
