import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base colors - Deep atmospheric
        base: {
          900: '#0a0a0f',
          800: '#0f0c29',
          700: '#1a1a2e',
          600: '#16213e',
          500: '#302b63',
        },
        // Gunmetal tones
        gunmetal: {
          900: '#1c1c1e',
          800: '#2c2c2e',
          700: '#3a3a3c',
          600: '#48484a',
        },
        // Neon accents
        neon: {
          green: '#b0ff09',
          cyan: '#00f2ea',
          pink: '#ff0099',
          purple: '#bf00ff',
          orange: '#ff6b00',
        },
        // Semantic colors for trading
        long: '#00ff88',
        short: '#ff3366',
        whale: '#ffd700',
        smart: '#b0ff09',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Space Mono', 'Fira Code', 'monospace'],
        display: ['Unbounded', 'Syncopate', 'Space Grotesk', 'sans-serif'],
        body: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-gradient': `
          radial-gradient(at 40% 20%, hsla(263, 55%, 15%, 1) 0px, transparent 50%),
          radial-gradient(at 80% 0%, hsla(255, 70%, 12%, 1) 0px, transparent 50%),
          radial-gradient(at 0% 50%, hsla(270, 50%, 10%, 1) 0px, transparent 50%),
          radial-gradient(at 80% 50%, hsla(280, 60%, 8%, 1) 0px, transparent 50%),
          radial-gradient(at 0% 100%, hsla(255, 60%, 12%, 1) 0px, transparent 50%),
          radial-gradient(at 80% 100%, hsla(263, 55%, 10%, 1) 0px, transparent 50%)
        `,
        'grid-pattern': `
          linear-gradient(rgba(176, 255, 9, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(176, 255, 9, 0.03) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid': '50px 50px',
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slide-in 0.3s ease-out',
        'flash-green': 'flash-green 0.5s ease-out',
        'flash-red': 'flash-red 0.5s ease-out',
        'scan-line': 'scan-line 8s linear infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '100%': { boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'flash-green': {
          '0%': { backgroundColor: 'rgba(0, 255, 136, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'flash-red': {
          '0%': { backgroundColor: 'rgba(255, 51, 102, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      boxShadow: {
        'neon-green': '0 0 5px #b0ff09, 0 0 20px rgba(176, 255, 9, 0.3)',
        'neon-cyan': '0 0 5px #00f2ea, 0 0 20px rgba(0, 242, 234, 0.3)',
        'neon-pink': '0 0 5px #ff0099, 0 0 20px rgba(255, 0, 153, 0.3)',
        'whale': '0 0 10px #ffd700, 0 0 30px rgba(255, 215, 0, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(176, 255, 9, 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;

