"use client";

// 장소 검색 팝업 (v5.3, 어르신 기준 재설계):
// - 가운데 팝업 모달 (바텀시트 아님)
// - 결과 목록: 내부 스크롤 + 스크롤바 숨김(.no-scrollbar), 넘칠 때만 ▼ 버튼
// - 프로세스: 목록 탭 = 지도 미리보기(위치 확인) → 하단 [확인]을 눌러야 최종 선택
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
  const [pending, setPending] = useState<KakaoPlace | null>(null); // 확인 전 임시 선택
  const [canScrollDown, setCanScrollDown] = useState(false);
  const placesRef = useRef<any>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

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
      setPending(null);
      mapRef.current = null; // 미리보기 지도는 열 때마다 새로 생성
    }
  }, [open]);

  // 디바운스 키워드 검색 (춘천 중심 20km, 거리순)
  useEffect(() => {
    if (!open) return;
    if (!q.trim() || !placesRef.current) {
      setResults([]);
      setPending(null);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      placesRef.current.keywordSearch(
        q,
        (data: KakaoPlace[], status: string) => {
          setSearching(false);
          setResults(status === window.kakao.maps.services.Status.OK ? data.slice(0, 15) : []);
          setPending(null);
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

  // 임시 선택 → 지도 미리보기 표시
  useEffect(() => {
    if (!pending || !kakaoReady || !mapBoxRef.current) return;
    const kakao = window.kakao;
    const pos = new kakao.maps.LatLng(parseFloat(pending.y), parseFloat(pending.x));
    if (!mapRef.current) {
      mapRef.current = new kakao.maps.Map(mapBoxRef.current, { center: pos, level: 3, draggable: false });
      markerRef.current = new kakao.maps.Marker({ position: pos });
      markerRef.current.setMap(mapRef.current);
    } else {
      mapRef.current.relayout();
      mapRef.current.setCenter(pos);
      markerRef.current.setPosition(pos);
    }
  }, [pending, kakaoReady]);

  const checkScroll = () => {
    const el = listRef.current;
    if (!el) return setCanScrollDown(false);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
  };
  useEffect(() => {
    checkScroll();
  }, [results, pending]);

  const scrollDown = () => {
    listRef.current?.scrollBy({ top: (listRef.current?.clientHeight ?? 200) * 0.7, behavior: "smooth" });
  };

  const confirm = () => {
    if (!pending) return;
    onPick({ name: pending.place_name, lat: parseFloat(pending.y), lng: parseFloat(pending.x) });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div
        className="flex max-h-[88%] w-full max-w-sm flex-col rounded-3xl bg-bg p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-2">
          <p className="text-[1.05rem] font-black">{label} 장소 찾기</p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl px-3 text-[0.9rem] font-bold text-muted active:bg-primary-soft"
          >
            닫기
          </button>
        </div>

        {/* 검색 입력 */}
        <div className="flex items-stretch gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="주소·건물·가게 이름"
            autoFocus
            className="min-h-13 w-full rounded-xl border-2 border-primary bg-white px-4 text-[0.95rem] outline-none"
          />
          <VoiceButton onResult={setQ} />
        </div>

        {/* 결과 목록: 내부 스크롤 + 스크롤바 숨김 */}
        <div className="relative mt-3 min-h-0 flex-1">
          <div ref={listRef} onScroll={checkScroll} className="no-scrollbar h-full max-h-60 overflow-y-auto">
            {!q.trim() && (
              <p className="py-8 text-center leading-relaxed text-muted">
                가고 싶은 곳의 이름이나
                <br />
                주소를 입력해 주세요
              </p>
            )}
            {q.trim() && kakaoReady && searching && <p className="py-6 text-center text-muted">찾는 중…</p>}
            {q.trim() && kakaoReady && !searching && results.length === 0 && (
              <p className="py-6 text-center text-muted">찾지 못했어요 — 이름을 조금 바꿔보세요</p>
            )}
            {results.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-line bg-white">
                {results.map((p, i) => {
                  const isSel = pending === p;
                  return (
                    <button
                      key={`${p.place_name}-${i}`}
                      type="button"
                      onClick={() => setPending(p)}
                      className={`block w-full border-b border-line/50 px-4 py-3 text-left last:border-0 ${
                        isSel ? "bg-primary-soft ring-2 ring-inset ring-primary" : "active:bg-primary-soft"
                      }`}
                    >
                      <span className="text-[0.95rem] font-bold">{p.place_name}</span>
                      <span className="mt-0.5 block text-[0.75rem] text-muted">
                        {p.road_address_name || p.address_name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 넘칠 때만 ▼ (스크롤바가 숨겨져 있으므로 유일한 '더 있음' 신호) */}
          {canScrollDown && (
            <button
              type="button"
              onClick={scrollDown}
              aria-label="아래로 더 보기"
              className="absolute bottom-1.5 left-1/2 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-90"
            >
              <svg width="16" height="10" viewBox="0 0 22 14" aria-hidden>
                <path d="M2 2 L11 11 L20 2" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {/* 지도 미리보기 — 목록에서 장소를 누르면 위치 확인용으로 표시 */}
        {pending && (
          <div className="mt-3">
            <p className="mb-1 text-[0.8rem] font-bold text-muted">
              이 위치가 맞나요? — <span className="text-ink">{pending.place_name}</span>
            </p>
            <div ref={mapBoxRef} className="h-36 w-full overflow-hidden rounded-2xl border border-line" />
          </div>
        )}

        {/* 하단 확인 버튼 — 눌러야 최종 선택 */}
        <button
          type="button"
          onClick={confirm}
          disabled={!pending}
          className="mt-3 shrink-0 rounded-2xl bg-primary py-4 text-[1.05rem] font-black text-white disabled:opacity-40"
        >
          확인
        </button>
      </div>
    </div>
  );
}
