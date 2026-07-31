import { notFound } from "next/navigation";
import { getStop } from "@/lib/stops.server";
import ReportForm from "@/components/ReportForm";
import AppHeader from "@/components/AppHeader";

// 사진 제보 (spec §3.5)
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stop = getStop(id);
  if (!stop) notFound();

  return (
    <>
    <AppHeader title="사진 제보" />
    <main className="px-5 py-6">
      <h1 className="text-[1.1rem] font-bold text-muted">{stop.name} 정류장</h1>
      <p className="mt-3 text-[1.35rem] font-black leading-snug">
        불편한 곳을 사진으로 찍어 주세요
      </p>
      <ReportForm stopId={stop.id} stopName={stop.name} />
    </main>
    </>
  );
}
