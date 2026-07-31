"use client";

// 사진 제보 (spec §3.5): 버튼도 글자 입력도 없다 — 사진 한 장이 민원이자 조사다
import { useRef, useState } from "react";
import Link from "next/link";

type Phase = "idle" | "preview" | "sending" | "done" | "error";

export default function ReportForm({ stopId, stopName }: { stopId: string; stopName: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const fd = new FormData();
      fd.set("stopId", stopId);
      fd.set("photo", fileRef.current);
      const res = await fetch("/api/reports", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      setPhase("done");
    } catch {
      setPhase("error");
    }
  };

  if (phase === "done")
    return (
      <div className="mt-8 rounded-2xl border-2 border-primary bg-primary-soft p-6 text-center">
        <p className="text-[1.3rem] font-black text-primary">접수됐어요</p>
        <p className="mt-3 leading-relaxed">인공지능이 내용을 확인해 춘천시에 전달합니다</p>
        <Link
          href={`/stops/${stopId}`}
          className="mt-6 block rounded-xl bg-primary py-4 font-bold text-white"
        >
          정류장으로 돌아가기
        </Link>
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
            alt={`${stopName} 제보 사진 미리보기`}
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
              onClick={() => inputRef.current?.click()}
              disabled={phase === "sending"}
              className="flex-1 rounded-2xl border-2 border-line bg-white py-5 text-[1rem] font-bold text-muted"
            >
              다시 찍기
            </button>
            <button
              type="button"
              onClick={send}
              disabled={phase === "sending"}
              className="flex-2 w-full flex-[2] rounded-2xl bg-primary py-5 text-[1.15rem] font-black text-white disabled:opacity-60"
            >
              {phase === "sending" ? "보내는 중…" : "보내기"}
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
