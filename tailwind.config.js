/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./popup.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#22d3ee',
          violet: '#8b5cf6',
          green: '#34d399',
          amber: '#fbbf24',
          red: '#f87171'
        }
      },
      boxShadow: {
        glass: '0 10px 40px rgba(34, 211, 238, 0.18)',
        neon: '0 0 24px rgba(139, 92, 246, 0.45)'
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(34, 211, 238, 0.15)' },
          '50%': { boxShadow: '0 0 25px rgba(34, 211, 238, 0.28)' }
        }
      },
      animation: {
        pulseGlow: 'pulseGlow 3s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
