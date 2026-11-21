export default {
  content: ['./index.html', './App.tsx', './components/**/*.{ts,tsx}', './pages/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'nasa-blue': '#0B3D91',
        'nasa-light-blue': '#1051c4',
        'nasa-red': '#FC3D21',
        'nasa-gray': {
          100: '#f0f2f5',
          200: '#d9dde2',
          300: '#b5bcc6',
          400: '#929eac',
          500: '#768293',
          600: '#525f70',
          700: '#3c4758',
          800: '#252c37',
          900: '#1a1f28',
        },
      },
    },
  },
};
