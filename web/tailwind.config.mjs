/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      // Emotive state accent colours — map directly to ESP32 states
      colors: {
        idle:       '#06b6d4', // cyan   — 50–300 W
        happy:      '#ec4899', // pink   — drop in watts
        dizzy:      '#eab308', // yellow — spikes / fluctuations
        frustrated: '#a855f7', // purple — >1000 W for >15 min
        angry:      '#ef4444', // red    — >2500 W → relay cutoff
      },
      animation: {
        'ring-pulse':    'ringPulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'pillar-breath': 'pillarBreath 8s ease-in-out infinite',
        'fade-in':       'fadeIn 0.4s ease-out forwards',
      },
      keyframes: {
        ringPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.4', transform: 'scale(1.12)' },
        },
        pillarBreath: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%':      { transform: 'scaleY(1.1)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
  // Safelist arbitrary values used in JSX class:list bindings
  safelist: ['bg-white/2', 'bg-white/3', 'bg-white/8'],
};
