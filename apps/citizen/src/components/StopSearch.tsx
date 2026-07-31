'use client';

import { useEffect, useRef, useState } from 'react';
import type { Stop } from '@ccbs/core';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function StopSearch({
  label,
  placeholder = '정류장 이름',
  value,
  inline = false,
  onSelect,
}: {
  label?: string;
  placeholder?: string;
  value?: Stop | null;
  /** 인풋과 음성 버튼을 한 줄에 배치 */
  inline?: boolean;
  onSelect: (stop: Stop | null) => void;
}) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState<Stop[]>([]);
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      recognitionRef.current?.stop();
    };
  }, []);

  function runSearch(q: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }
      const res = await fetch(`/api/stops?q=${encodeURIComponent(q)}`);
      const json = (await res.json()) as { stops: Stop[] };
      setResults(json.stops);
      setOpen(json.stops.length > 0);
    }, 180);
  }

  function handleChange(next: string) {
    setQuery(next);
    onSelect(null);
    runSearch(next);
  }

  function pick(stop: Stop) {
    setQuery(stop.name);
    setResults([]);
    setOpen(false);
    onSelect(stop);
  }

  function startVoice() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setSpeechError('이 브라우저에서는 음성 검색을 쓸 수 없습니다.');
      return;
    }

    setSpeechError(null);
    const recognition = new Ctor();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? '';
      if (!transcript) {
        setSpeechError('다시 말씀해 주세요.');
        return;
      }
      setQuery(transcript);
      onSelect(null);
      runSearch(transcript);
    };
    recognition.onerror = (event) => {
      setSpeechError(
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? '마이크 사용을 허용해 주세요.'
          : event.error === 'no-speech'
            ? '소리가 들리지 않았습니다.'
            : '음성 검색에 실패했습니다.',
      );
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  const input = (
    <input
      value={query}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={() => results.length > 0 && setOpen(true)}
      placeholder={placeholder}
      className="min-h-[56px] w-full min-w-0 rounded-2xl border-2 border-slate-200 bg-white px-4 text-base outline-none placeholder:text-slate-400 focus:border-chuncheon"
      aria-autocomplete="list"
      role="combobox"
      aria-expanded={open}
      aria-controls="stop-search-results"
    />
  );

  return (
    <div className="space-y-2">
      {label && <label className="block text-lg font-bold text-slate-800">{label}</label>}

      {inline ? (
        <div className="flex items-stretch gap-2">
          {input}
          <button
            type="button"
            onClick={startVoice}
            disabled={listening || !speechSupported}
            className="tap-feedback w-[92px] shrink-0 rounded-2xl bg-navy px-2 text-base font-bold leading-tight text-white disabled:bg-slate-300 disabled:text-slate-500"
          >
            {listening ? (
              '듣는 중'
            ) : (
              <>
                음성으로
                <br />
                찾기
              </>
            )}
          </button>
        </div>
      ) : (
        <>
          {input}
          <button
            type="button"
            onClick={startVoice}
            disabled={listening || !speechSupported}
            className="tap-feedback min-h-touch w-full rounded-2xl border-2 border-chuncheon bg-white text-base font-bold text-chuncheon disabled:border-slate-200 disabled:text-slate-400"
          >
            {listening ? '듣고 있습니다' : '음성으로 찾기'}
          </button>
        </>
      )}

      {speechError && <p className="text-base font-bold text-warn">{speechError}</p>}

      {open && results.length > 0 && (
        <ul
          id="stop-search-results"
          role="listbox"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          {results.slice(0, 6).map((stop) => (
            <li key={stop.id}>
              <button
                type="button"
                onClick={() => pick(stop)}
                className="tap-feedback flex min-h-touch w-full items-center px-4 py-3 text-left text-lg font-bold text-slate-900"
              >
                {stop.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
