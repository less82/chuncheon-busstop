import type { Config } from 'tailwindcss';

/** 관리자 콘솔은 데스크톱 정보밀도 우선 — 기본 폰트 스케일을 키우지 않는다. */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 춘천시 도시브랜드 기본색상 PANTONE 299 C
        chuncheon: {
          DEFAULT: '#00A3E0',
          50: '#E8F7FD',
          100: '#CCEDFA',
          200: '#8FDAF4',
          500: '#00A3E0',
          600: '#008EC4',
          700: '#0077A6',
          800: '#001871', // 춘천시기 남색 PANTONE 2748 C
          900: '#001458',
        },
        warn: '#D93025',
        okay: '#1E7B34',
      },
    },
  },
  plugins: [],
};

export default config;
