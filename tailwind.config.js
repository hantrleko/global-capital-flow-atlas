/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        finance: {
          bg: '#070a12',
          card: '#0d1321',
          subtle: '#131b2e',
          floating: '#182238',
          cardBorder: '#1e293b',
          accent: '#6366f1',
          teal: '#06b6d4',
          amber: '#f59e0b',
          rose: '#f43f5e',
          emerald: '#10b981',
          purple: '#8b5cf6'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'ui-monospace', 'monospace'],
        sans: ['Inter', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei UI"', 'system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
