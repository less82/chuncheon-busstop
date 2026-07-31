"use client";

// 장소 검색 모달 (v5.2): 주소·건물·상호 입력 → 결과 목록을 별도 모달로 표시
// 목록이 화면을 넘어가면 모달 하단에 ▼ 버튼 — 누르면 아래로 스크롤 (어르신 스크롤 보조)
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

export default function PlaceSearchModal({
  label,
  open,
  onPick,
  onClose,
}: {
  label: string;
  open: boolean;
  onPick: (p: Place) => void;
  onClose: () => void;
}) {
  const kakaoReady = useKakaoReady();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const placesRef = useRef<any>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (kakaoReady && !placesRef.current) {
      placesRef.current = new window.kakao.maps.services.Places();
    }
  }, [kakaoReady]);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setQ("");
      setResults([]);
    }
  }, [open]);

  // 디바운스 키워드 검색 (춘천 중심 20km, 거리순)
  useEffect(() => {
    if (!open) return;
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
          setResults(status === window.kakao.maps.services.Status.OK ? data.slice(0, 15) : []);
        },
        {
          location: new window.kakao.maps.LatLng(37.8813, 127.73),
          radius: 20000,
          sort: window.kakao.maps.services.SortBy.DISTANCE,
        },
      );
    }, 350);
    return () => clearTimeout(t);
  }, [q, open]);

  // 목록이 넘치는지 감시 (결과 변경·스크롤 시)
  const checkScroll = () => {
    const el = listRef.current;
    if (!el) return setCanScrollDown(false);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
  };
  useEffect(() => {
    checkScroll();
  }, [results]);

  const scrollDown = () => {
    const el = listRef.current;
    if (el) el.scrollBy({ top: el.clientHeight * 0.7, behavior: "smooth" });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black/40" onClick={onClose}>
      <div
        className="mt-8 flex min-h-0 flex-1 flex-col rounded-t-3xl bg-bg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <p className="text-[1.1rem] font-black">{label} 장소 찾기</p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl px-3 text-[0.95rem] font-bold text-muted active:bg-primary-soft"
          >
            닫기
          </button>
        </div>

        {/* 검색 입력 */}
        <div className="flex items-stretch gap-2 px-5 pb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="주소·건물·가게 이름"
            autoFocus
            className="min-h-14 w-full rounded-xl border-2 border-primary bg-white px-4 text-[1rem] outline-none"
          />
          <VoiceButton onResult={setQ} />
        </div>

        {/* 결과 목록 (스크롤 영역) */}
        <div ref={listRef} onScroll={checkScroll} className="min-h-0 flex-1 overflow-y-auto px-5 pb-24">
          {!q.trim() && (
            <p className="mt-8 text-center leading-relaxed text-muted">
              가고 싶은 곳의 이름이나
              <br />
              주소를 입력해 주세요
            </p>
          )}
          {q.trim() && !kakaoReady && <p className="mt-6 text-center text-muted">장소 검색 준비 중…</p>}
          {q.trim() && kakaoReady && searching && <p className="mt-6 text-center text-muted">찾는 중…</p>}
          {q.trim() && kakaoReady && !searching && results.length === 0 && (
            <p className="mt-6 text-center text-muted">찾지 못했어요 — 이름을 조금 바꿔보세요</p>
          )}
          {results.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              {results.map((p, i) => (
                <button
                  key={`${p.place_name}-${i}`}
                  type="button"
                  onClick={() => onPick({ name: p.place_name, lat: parseFloat(p.y), lng: parseFloat(p.x) })}
                  className="block w-full border-b border-line/50 px-4 py-3.5 text-left last:border-0 active:bg-primary-soft"
                >
                  <span className="text-[1rem] font-bold">{p.place_name}</span>
                  <span className="mt-0.5 block text-[0.78rem] text-muted">
                    {p.road_address_name || p.address_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 아래로 스크롤 버튼 — 목록이 화면을 넘어갈 때만 */}
        {canScrollDown && (
          <button
            type="button"
            onClick={scrollDown}
            aria-label="아래로 더 보기"
            className="absolute bottom-5 left-1/2 z-10 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-90"
          >
            <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden>
              <path d="M2 2 L11 11 L20 2" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
