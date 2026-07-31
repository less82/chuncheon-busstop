"use client";

// 장소 검색 (개편 §1): 정류장이 아니라 주소·건물·상호로 입력 — 카카오 Places 키워드 검색
import { useEffect, useRef, useState } from "react";
import { useKakaoReady } from "@/lib/useKakao";
import type { Place } from "@/lib/journey";
import VoiceButton from "./VoiceButton";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface KakaoPlace {
  place_name: string;
  road_address_name: string;
  address_name: string;
  x: string; // lng
  y: string; // lat
}

export default function PlaceSearch({
  label,
  onPick,
}: {
  label: string;
  onPick: (p: Place) => void;
}) {
  const kakaoReady = useKakaoReady();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const placesRef = useRef<any>(null);

  useEffect(() => {
    if (kakaoReady && !placesRef.current) {
      placesRef.current = new window.kakao.maps.services.Places();
    }
  }, [kakaoReady]);

  // 입력 디바운스 검색 (춘천 중심 반경 20km 우선)
  useEffect(() => {
    if (!q.trim() || !placesRef.current) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      placesRef.current.keywordSearch(
        q,
        (data: KakaoPlace[], status: string) => {
          setSearching(false);
          setResults(status === window.kakao.maps.services.Status.OK ? data.slice(0, 6) : []);
        },
        {
          location: new window.kakao.maps.LatLng(37.8813, 127.73),
          radius: 20000,
          sort: window.kakao.maps.services.SortBy.DISTANCE,
        },
      );
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="flex items-stretch gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`${label}: 주소·건물·가게 이름`}
          autoFocus
          className="min-h-14 w-full rounded-xl border-2 border-primary bg-white px-4 text-[1rem] outline-none"
        />
        <VoiceButton onResult={setQ} />
      </div>
      {q.trim() && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-white">
          {!kakaoReady && <p className="p-4 text-[0.9rem] text-muted">장소 검색 준비 중…</p>}
          {kakaoReady && searching && <p className="p-4 text-[0.9rem] text-muted">찾는 중…</p>}
          {kakaoReady && !searching && results.length === 0 && (
            <p className="p-4 text-[0.9rem] text-muted">찾지 못했어요 — 이름을 조금 바꿔보세요</p>
          )}
          {results.map((p, i) => (
            <button
              key={`${p.place_name}-${i}`}
              type="button"
              onClick={() =>
                onPick({ name: p.place_name, lat: parseFloat(p.y), lng: parseFloat(p.x) })
              }
              className="block w-full border-b border-line/50 px-4 py-3 text-left last:border-0 active:bg-primary-soft"
            >
              <span className="font-bold">{p.place_name}</span>
              <span className="mt-0.5 block text-[0.75rem] text-muted">
                {p.road_address_name || p.address_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
