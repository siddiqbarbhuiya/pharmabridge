/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        // Core neutrals
        ink:   '#0A0A0B',
        paper: '#FFFFFF',
        bone:  '#F7F7F5',
        line:  '#E6E6E3',

        // Pastel section tints
        sky:   '#DCE8FF',
        mist:  '#EAF1FF',
        blush: '#FBE3E8',
        peach: '#FFE0CC',
        mint:  '#D8F0E2',
        lilac: '#E4DEFF',

        // Brand gradient stops
        brand: {
          indigo: '#5B5BFF',
          violet: '#8A6BFF',
          coral:  '#FF6A4D',
          cyan:   '#7BC8FF',
        },

        // Semantic — PharmaBridge
        rx:      '#0E7C66',
        'rx-dark': '#0A6054',
        warning: '#C77700',
        danger:  '#C0392B',
      },
      fontFamily: {
        display: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        hero:    ['clamp(2.5rem, 6vw, 5.5rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        display: ['clamp(1.75rem, 3.5vw, 3.5rem)', { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        sm:   '6px',
        md:   '10px',
        lg:   '16px',
        xl:   '24px',
        '2xl': '32px',
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(10,10,11,.04), 0 8px 24px rgba(10,10,11,.04)',
        card: '0 1px 3px rgba(10,10,11,.06), 0 4px 16px rgba(10,10,11,.04)',
        up:   '0 -1px 2px rgba(10,10,11,.04), 0 -8px 24px rgba(10,10,11,.04)',
      },
      animation: {
        shimmer:   'shimmer 1.5s infinite',
        'orb-spin':'orbSpin 30s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        orbSpin: {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}
