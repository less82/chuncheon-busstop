import type { Config } from 'tailwindcss';

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
        },
        // 춘천시기 로고타입 남색 PANTONE 2748 C
        navy: {
          DEFAULT: '#001871',
          50: '#E6E8F1',
          600: '#001458',
        },
        warn: '#D93025',
        okay: '#1E7B34',
        // 안전영역 가이드 전용 컬러
        guide: '#FFD400',
      },
      fontSize: {
        // 360px 화면 기준 — 고령자 가독성과 줄바꿈 안정성의 균형
        sm: ['14px', '1.5'],
        base: ['17px', '1.5'],
        lg: ['19px', '1.45'],
        xl: ['22px', '1.35'],
        '2xl': ['25px', '1.3'],
        '3xl': ['29px', '1.25'],
        '4xl': ['34px', '1.2'],
      },
      minHeight: { touch: '48px' },
      minWidth: { touch: '48px' },
      boxShadow: { card: '0 2px 10px rgba(0, 0, 0, 0.08)' },
    },
  },
  plugins: [],
};

export default config;
