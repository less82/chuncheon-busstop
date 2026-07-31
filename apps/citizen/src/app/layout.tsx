import type { Metadata, Viewport } from 'next';
import { MobileFrame } from '@/components/MobileFrame';
import './globals.css';

export const metadata: Metadata = {
  title: '쉼표정류장',
  description: '시원하게 기다릴 정류장을 찾아드립니다',
  applicationName: '쉼표정류장',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '쉼표정류장',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#001871',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full antialiased">
        <MobileFrame>{children}</MobileFrame>
      </body>
    </html>
  );
}
