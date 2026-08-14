/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0d1117',
        surface: {
          50: '#212c3f',
          100: '#1b2434',
          200: '#151d2c',
          300: '#0f1724',
          card: 'rgba(21, 29, 44, 0.85)',
        },
        fpl: {
          cyan: '#10b981',     // Myk, moderne smaragdgrønn (daisyUI accent)
          green: '#059669',    // Live poeng / suksess
          purple: '#3b0764',   // Elegant dyp lilla
          accent: '#f43f5e',   // Rose / Pink
          violet: '#6366f1',   // Desktop aksent
          indigo: '#4f46e5',   // Subtil UI-aksent
          gold: '#f59e0b',     // 1. plass / Månedsvinner
          silver: '#94a3b8',   // 2. plass
          bronze: '#d97706',   // 3. plass
          danger: '#f43f5e',   // Transfer hits / -4
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.25)',
        'glow-cyan': '0 0 12px -2px rgba(16, 185, 129, 0.25)',
        'glow-purple': '0 0 12px -2px rgba(99, 102, 241, 0.25)',
        'glass-card': '0 8px 30px 0 rgba(0, 0, 0, 0.28)',
      },
    },
  },
  plugins: [],
};
