"use client";

// 음성 검색 (spec §3.1): Web Speech API, 미지원 브라우저에선 버튼 자동 숨김
import { useEffect, useRef, useState } from "react";

// 브라우저별 SpeechRecognition 타입 (표준 타입 미제공)
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export default function VoiceButton({ onResult }: { onResult: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    recRef.current = getRecognition();
    setSupported(recRef.current !== null);
  }, []);

  if (!supported) return null;

  const start = () => {
    const rec = recRef.current;
    if (!rec) return;
    rec.lang = "ko-KR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript?.trim();
      setListening(false);
      if (text) onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="min-h-12 shrink-0 rounded-xl bg-primary px-3 text-[0.85rem] font-bold text-white"
      >
        음성으로
        <br />
        찾기
      </button>
      {listening && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-primary/95 px-8 text-center"
          onClick={() => {
            recRef.current?.stop();
            setListening(false);
          }}
        >
          <p className="text-3xl font-bold text-white">말씀해 주세요</p>
          <p className="text-lg text-white/80">예) &ldquo;중앙시장&rdquo;</p>
          <p className="mt-8 text-base text-white/60">화면을 누르면 취소됩니다</p>
        </div>
      )}
    </>
  );
}
