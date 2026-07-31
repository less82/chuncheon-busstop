import { Suspense } from "react";
import TabBar from "@/components/TabBar";
import StatusBar from "@/components/phone/StatusBar";
import GalaxyNavBar from "@/components/phone/GalaxyNavBar";
import KakaoLoader from "@/components/KakaoLoader";
import HomePathTracker from "@/components/HomePathTracker";

// B2C 레이아웃:
// - 실제 폰(lg 미만): 프레임 없이 전체 화면 + OS 안전영역(env safe-area) 존중
// - 데스크톱(lg 이상): 갤럭시 프레임 목업(베젤·상태바·펀치홀·3버튼 내비) 안에 앱 표시
export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center lg:bg-[#dfe6ee] lg:py-8">
      {/* lg:translate-x-0 — transform이 있으면 내부 fixed 요소(음성 오버레이 등)가 프레임 기준으로 잡힘 */}
      <div className="relative flex h-dvh w-full max-w-md flex-col bg-bg pt-[env(safe-area-inset-top)] lg:h-[min(880px,92vh)] lg:w-[406px] lg:translate-x-0 lg:rounded-[2.6rem] lg:border-[10px] lg:border-[#15181d] lg:pt-0 lg:shadow-2xl lg:shadow-black/40 lg:overflow-hidden">
        {/* 측면 버튼 (전원·볼륨) — 프레임 장식 */}
        <span className="absolute -right-[13px] top-36 hidden h-16 w-[3px] rounded-r bg-[#2a2e35] lg:block" />
        <span className="absolute -left-[13px] top-32 hidden h-10 w-[3px] rounded-l bg-[#2a2e35] lg:block" />
        <span className="absolute -left-[13px] top-44 hidden h-10 w-[3px] rounded-l bg-[#2a2e35] lg:block" />

        <KakaoLoader />
        <Suspense>
          <HomePathTracker />
        </Suspense>
        <StatusBar />
        <div className="relative min-h-0 flex-1 overflow-y-auto">{children}</div>
        <TabBar />
        <GalaxyNavBar />
      </div>
    </div>
  );
}
