import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#101317',
          900: '#171b21',
          800: '#20262d',
          700: '#313945',
          500: '#687381',
          300: '#aeb7c2',
          100: '#eef2f5',
          50: '#f7f9fb',
        },
        lens: {
          600: '#2563eb',
          500: '#3478f6',
          100: '#dbeafe',
        },
        proof: {
          500: '#14b8a6',
          100: '#ccfbf1',
        },
      },
      boxShadow: {
        panel: '0 18px 60px rgba(16, 19, 23, 0.12)',
        control: '0 1px 2px rgba(16, 19, 23, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
