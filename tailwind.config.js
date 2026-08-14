/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#070a12',
        surface: {
          50: '#1b2333',
          100: '#141c2b',
          200: '#0f1624',
          300: '#0a0f1a',
          card: 'rgba(15, 22, 36, 0.75)',
        },
        fpl: {
          cyan: '#00ff87',     // Ikonisk FPL Cyan / Neon Green
          green: '#02efad',    // Live poeng / suksess
          purple: '#38003c',   // Ikonisk FPL Mørk Lilla
          accent: '#e90052',   // FPL Magenta / Pink
          violet: '#7c3aed',   // Desktop aksent
          indigo: '#6366f1',   // Subtil UI-aksent
          gold: '#fbbf24',     // 1. plass / Månedsvinner
          silver: '#94a3b8',   // 2. plass
          bronze: '#d97706',   // 3. plass
          danger: '#ef4444',   // Transfer hits / -4
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
        'glow-cyan': '0 0 20px -3px rgba(0, 255, 135, 0.3)',
        'glow-purple': '0 0 20px -3px rgba(124, 58, 237, 0.35)',
        'glow-magenta': '0 0 20px -3px rgba(233, 0, 82, 0.35)',
        'glass-card': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
    },
  },
  plugins: [],
};
