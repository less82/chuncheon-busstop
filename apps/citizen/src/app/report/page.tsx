'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const MY_REPORTS_KEY = 'chuncheon-my-report-ids';

interface Shot {
  blob: Blob;
  url: string;
  capturedAt: string;
  coords: { lat: number; lng: number } | null;
}

export default function ReportPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [shot, setShot] = useState<Shot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('이 브라우저에서는 촬영할 수 없습니다');
      return;
    }

    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setCameraError('카메라를 열지 못했습니다'), 6000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        // 캔버스 촬영에 필요한 해상도가 확정된 뒤 셔터를 활성화한다
        video.onloadedmetadata = () => {
          void video.play();
          setCameraReady(true);
          setCameraError(null);
          if (openTimer.current) clearTimeout(openTimer.current);
        };
      }
    } catch {
      setCameraError('카메라 사용을 허용해 주세요');
      setCameraReady(false);
      if (openTimer.current) clearTimeout(openTimer.current);
    }
  }, []);

  useEffect(() => {
    void startCamera();
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !cameraReady) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const capturedAt = new Date().toISOString();
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setShot({ blob, url: URL.createObjectURL(blob), capturedAt, coords: null });
        stopCamera();

        // 촬영 순간의 좌표만 사용 (캐시 좌표 사용 안 함)
        navigator.geolocation?.getCurrentPosition(
          (position) =>
            setShot((prev) =>
              prev
                ? {
                    ...prev,
                    coords: { lat: position.coords.latitude, lng: position.coords.longitude },
                  }
                : prev,
            ),
          () => undefined,
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
        );
      },
      'image/jpeg',
      0.9,
    );
  }

  function retake() {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    setError(null);
    void startCamera();
  }

  function rememberMyReport(id: string) {
    try {
      const prev = JSON.parse(localStorage.getItem(MY_REPORTS_KEY) || '[]') as string[];
      localStorage.setItem(MY_REPORTS_KEY, JSON.stringify([id, ...prev].slice(0, 50)));
    } catch {
      // localStorage 차단 환경에서는 기록만 생략
    }
  }

  async function submit() {
    if (!shot) return;
    setError(null);
    setSubmitting(true);

    try {
      const form = new FormData();
      form.append('file', new File([shot.blob], 'report.jpg', { type: 'image/jpeg' }));
      const up = await fetch('/api/upload', { method: 'POST', body: form });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson.error || '사진을 보내지 못했습니다.');

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_url: upJson.url,
          lat: shot.coords?.lat ?? null,
          lng: shot.coords?.lng ?? null,
          captured_at: shot.capturedAt,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '제보에 실패했습니다.');

      rememberMyReport(json.report.id as string);
      setDone(true);
      setTimeout(() => router.push('/my-reports'), 1200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-black text-white">
      <div className="flex min-h-[52px] items-center justify-between px-4">
        <Link href="/" className="tap-feedback py-3 text-base font-bold text-white/80">
          닫기
        </Link>
        <span className="text-base font-bold">불편사항 촬영</span>
        <span className="w-9" />
      </div>

      <div className="relative flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${shot ? 'hidden' : ''}`}
        />
        {shot && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.url} alt="" className="h-full w-full object-cover" />
        )}

        {!shot && (
          <>
            <ViewfinderFrame />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-lg font-bold text-white/80">
                {cameraError ?? '카메라 준비 중'}
              </div>
            )}
          </>
        )}

        {error && (
          <p className="absolute inset-x-0 bottom-3 px-5 text-center text-base font-bold text-rose-300">
            {error}
          </p>
        )}
        {done && (
          <p className="absolute inset-x-0 bottom-3 px-5 text-center text-base font-bold text-emerald-300">
            접수되었습니다
          </p>
        )}
      </div>

      <div className="flex min-h-[132px] items-center justify-center bg-black px-5 py-4">
        {shot ? (
          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              disabled={submitting || done}
              onClick={retake}
              className="tap-feedback min-h-touch flex-1 rounded-2xl border-2 border-white/60 py-3 text-lg font-bold text-white disabled:opacity-40"
            >
              다시 찍기
            </button>
            <button
              type="button"
              disabled={submitting || done}
              onClick={() => void submit()}
              className="tap-feedback min-h-touch flex-1 rounded-2xl bg-chuncheon py-3 text-lg font-extrabold text-white disabled:opacity-40"
            >
              {submitting ? '보내는 중' : '보내기'}
            </button>
          </div>
        ) : cameraError ? (
          <button
            type="button"
            onClick={() => void startCamera()}
            className="tap-feedback min-h-touch w-full rounded-2xl bg-chuncheon py-3 text-lg font-extrabold text-white"
          >
            카메라 다시 열기
          </button>
        ) : (
          <button
            type="button"
            aria-label="촬영"
            disabled={!cameraReady}
            onClick={takePhoto}
            className="tap-feedback flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-white/90 disabled:border-white/30"
          >
            <span
              className={`block h-[60px] w-[60px] rounded-full ${
                cameraReady ? 'bg-white' : 'bg-white/40'
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}

/** 뷰파인더 네 모서리 가이드 */
function ViewfinderFrame() {
  const corner = 'absolute h-7 w-7 border-white/70';
  return (
    <div className="pointer-events-none absolute inset-6">
      <span className={`${corner} left-0 top-0 border-l-2 border-t-2`} />
      <span className={`${corner} right-0 top-0 border-r-2 border-t-2`} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} />
    </div>
  );
}
