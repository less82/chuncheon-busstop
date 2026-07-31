"use client";

// 민원 탭 (v8.2): 들어오면 바로 카메라 — 사진 한 장 + [확인]이 전부.
// 정류장은 묻지 않는다: 촬영 시점의 내 위치(GPS)로 최근접 정류장을 내부 매칭하고,
// 접수 시각은 서버가 타임스탬프로 기록한다.
import { useEffect, useRef, useState } from "react";
import slimStops from "@/lib/data/stops.slim.json";
import type { SlimStop } from "@/lib/types";
import { DEFAULT_CENTER, distanceM } from "@/lib/geo";

const ALL = slimStops as SlimStop[];

type Phase = "idle" | "preview" | "sending" | "done" | "error";

function nearestStop(lat: number, lng: number): SlimStop {
  let best = ALL[0];
  let bd = Infinity;
  for (const s of ALL) {
    const d = distanceM(lat, lng, s.lat, s.lng);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

export default function CameraReport() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [doneStop, setDoneStop] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const coordRef = useRef<{ lat: number; lng: number }>(DEFAULT_CENTER);

  // 내 위치 확보 (촬영 위치 = 정류장 매칭 기준)
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => { coordRef.current = { lat: p.coords.latitude, lng: p.coords.longitude }; },
      () => {},
      { timeout: 5000 },
    );
  }, []);

  // 탭 진입 즉시 카메라 열기 (브라우저가 막으면 아래 [사진 찍기] 버튼이 대신한다)
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.click(), 250);
    return () => clearTimeout(t);
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    fileRef.current = f;
    setPreviewUrl(URL.createObjectURL(f));
    setPhase("preview");
  };

  const send = async () => {
    if (!fileRef.current) return;
    setPhase("sending");
    try {
      const stop = nearestStop(coordRef.current.lat, coordRef.current.lng);
      const fd = new FormData();
      fd.set("stopId", stop.id);
      fd.set("photo", fileRef.current);
      const res = await fetch("/api/reports", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      setDoneStop(stop.name);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  };

  const retake = () => {
    setPhase("idle");
    setPreviewUrl(null);
    fileRef.current = null;
    inputRef.current?.click();
  };

  if (phase === "done")
    return (
      <div className="mt-8 rounded-2xl border-2 border-primary bg-primary-soft p-6 text-center">
        <p className="text-[1.3rem] font-black text-primary">접수됐어요</p>
        <p className="mt-3 leading-relaxed">
          {doneStop && (
            <>
              <span className="font-bold">{doneStop}</span> 정류장으로 접수됐어요.
              <br />
            </>
          )}
          인공지능이 내용을 확인해
          <br />
          춘천시에 전달합니다
        </p>
        <button
          type="button"
          onClick={retake}
          className="mt-6 block w-full rounded-xl bg-primary py-4 font-bold text-white"
        >
          한 장 더 찍기
        </button>
      </div>
    );

  return (
    <div className="mt-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />

      {phase === "idle" && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-2xl bg-primary py-8 text-[1.3rem] font-black text-white active:opacity-90"
        >
          사진 찍기
        </button>
      )}

      {(phase === "preview" || phase === "sending" || phase === "error") && previewUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="제보 사진 미리보기"
            className="max-h-80 w-full rounded-2xl border border-line object-cover"
          />
          {phase === "error" && (
            <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-center text-[0.9rem] font-bold text-warn">
              보내지 못했어요. 다시 눌러 주세요.
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={retake}
              disabled={phase === "sending"}
              className="flex-1 rounded-2xl border-2 border-line bg-white py-5 text-[1rem] font-bold text-muted"
            >
              다시 찍기
            </button>
            <button
              type="button"
              onClick={send}
              disabled={phase === "sending"}
              className="w-full flex-[2] rounded-2xl bg-primary py-5 text-[1.15rem] font-black text-white disabled:opacity-60"
            >
              {phase === "sending" ? "보내는 중…" : "확인"}
            </button>
          </div>
        </>
      )}

      <p className="mt-5 text-[0.8rem] leading-relaxed text-muted">
        사진에 사람 얼굴이나 차량번호가 나오지 않게 해주세요.
      </p>
    </div>
  );
}
