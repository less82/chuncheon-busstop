import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "쉼표정류장",
  description: "시원하게 기다릴 정류장을 찾아드립니다 — 춘천 버스정류장 시설·도착 안내",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#004f9e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
