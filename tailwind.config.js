/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'oklch(0.16 0.01 82)',
        charcoal: 'oklch(0.22 0.012 82)',
        paper: 'oklch(0.97 0.012 85)',
        bone: 'oklch(0.92 0.018 86)',
        yellow: 'oklch(0.84 0.16 83)',
        'yellow-deep': 'oklch(0.74 0.145 78)',
        line: 'oklch(0.35 0.012 82 / 0.2)',
        verified: 'oklch(0.55 0.12 150)',
      },
      fontFamily: {
        display: ['"Zalando Sans"', 'Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        lift: '0 18px 50px -36px oklch(0.16 0.01 82 / 0.35)',
      },
    },
  },
  plugins: [],
};
