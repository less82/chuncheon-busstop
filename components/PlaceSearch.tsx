"use client";

// 장소 검색 팝업 (v5.4, 어르신 기준 재설계):
// - 가운데 팝업 모달 (바텀시트 아님)
// - 결과 목록: 내부 스크롤 + 스크롤바 숨김(.no-scrollbar)
// - 프로세스: 목록 탭 → 그 항목 '바로 아래'에 지도 미리보기가 펼쳐짐 → 하단 [확인]을 눌러야 최종 선택
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
  const placesRef = useRef<any>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const mapBoxRef = useRef<HTMLDivElement>(null);

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

  // 임시 선택 → 해당 항목 아래에 펼쳐진 지도 미리보기 생성
  // (미리보기 div가 목록 안에서 위치를 옮겨 다니며 매번 새로 마운트되므로 지도도 매번 새로 만든다)
  useEffect(() => {
    if (!pending || !kakaoReady || !mapBoxRef.current) return;
    const kakao = window.kakao;
    const pos = new kakao.maps.LatLng(parseFloat(pending.y), parseFloat(pending.x));
    const map = new kakao.maps.Map(mapBoxRef.current, { center: pos, level: 3, draggable: false });
    new kakao.maps.Marker({ position: pos }).setMap(map);
    // 펼쳐진 지도가 목록 스크롤 밖에 있으면 보이도록 끌어온다
    mapBoxRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [pending, kakaoReady]);

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
        {/* 헤더 (닫기 버튼 없음 — 바깥 배경을 누르면 닫힌다) */}
        <p className="pb-2 text-[1.05rem] font-black">{label} 장소 찾기</p>

        {/* 검색 입력 */}
        <div className="flex items-stretch gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이곳에 입력해 주세요"
            autoFocus
            className="min-h-13 w-full rounded-xl border-2 border-primary bg-white px-4 text-[0.95rem] outline-none"
          />
          <VoiceButton onResult={setQ} />
        </div>

        {/* 결과 목록: 내부 스크롤 + 스크롤바 숨김. 선택한 항목 바로 아래에 지도가 펼쳐진다 */}
        <div className="relative mt-3 min-h-0 flex-1">
          <div ref={listRef} className="no-scrollbar h-full max-h-60 overflow-y-auto">
            {!q.trim() && (
              <p className="px-4 py-8 text-center leading-relaxed text-muted">
                가고 싶은 곳의 이름이나 주소를 입력해 주세요
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
                    <div
                      key={`${p.place_name}-${i}`}
                      className={`border-b border-line/50 last:border-0 ${isSel ? "bg-primary-soft" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          // 키보드를 내려 하단 [확인]·지도 미리보기 영역 확보
                          (document.activeElement as HTMLElement | null)?.blur?.();
                          setPending(isSel ? null : p);
                        }}
                        className={`block w-full px-4 py-3 text-left ${
                          isSel ? "" : "active:bg-primary-soft"
                        }`}
                      >
                        <span className={`text-[0.95rem] font-bold ${isSel ? "text-primary" : ""}`}>
                          {p.place_name}
                        </span>
                        <span className="mt-0.5 block text-[0.75rem] text-muted">
                          {p.road_address_name || p.address_name}
                        </span>
                      </button>
                      {/* 선택한 항목 바로 아래에 종속된 지도 미리보기 */}
                      {isSel && (
                        <div className="px-3 pb-3">
                          <p className="mb-1 text-[0.8rem] font-bold text-muted">이 위치가 맞나요?</p>
                          <div
                            ref={mapBoxRef}
                            className="h-36 w-full overflow-hidden rounded-xl border-2 border-primary"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

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
