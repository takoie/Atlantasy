/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#1c2128', // DaisyUI Dim base-300
        surface: {
          50: '#384252',
          100: '#2A303C', // Dim base-100
          200: '#242B35', // Dim base-200
          300: '#1c2128', // Dim base-300
          card: '#2A303C',
        },
        dim: {
          base: '#1c2128',
          card: '#2A303C',
          inset: '#242B35',
          border: '#384252',
          primary: '#9FE88D',
          secondary: '#F471B5',
          accent: '#70E1F8',
          neutral: '#191E24',
          content: '#E2E8F0',
          muted: '#94A3B8',
        },
        fpl: {
          cyan: '#70E1F8',
          green: '#9FE88D',    // DaisyUI Dim Primary Mint
          purple: '#2E2836',
          accent: '#F4C152',   // Dim Amber/Gold
          violet: '#A78BFA',
          indigo: '#9FE88D',
          gold: '#F4C152',     // 1. plass / Månedsvinner
          silver: '#94A3B8',   // 2. plass
          bronze: '#D97706',   // 3. plass
          danger: '#FB6F84',   // Dim Error / Transfer hits
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'dim': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'dim-sm': '0 2px 8px 0 rgba(0, 0, 0, 0.35)',
        'glow-primary': '0 0 14px -2px rgba(159, 232, 141, 0.35)',
        'glow-accent': '0 0 14px -2px rgba(244, 193, 82, 0.35)',
      },
    },
  },
  plugins: [],
};

