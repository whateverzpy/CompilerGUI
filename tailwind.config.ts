import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Microsoft YaHei',
          'PingFang SC',
          'Noto Sans CJK SC',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      colors: {
        ink: {
          950: '#111111',
          800: '#2f2f2f',
          600: '#666666',
          400: '#9a9a9a',
        },
      },
      boxShadow: {
        focus: '0 0 0 3px rgb(17 17 17 / 8%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
