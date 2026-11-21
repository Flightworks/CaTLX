const tone = name => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './*.tsx', './contexts/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './pages/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'foreground': tone('foreground'),
        'separator': tone('separator'),
        'hover-surface': tone('hover-surface'),
        'accent-ink': tone('accent-ink'),
        'danger-ink': tone('danger-ink'),
        'success-ink': tone('success-ink'),
        'warning-ink': tone('warning-ink'),
        'warning-surface': tone('warning-surface'),
        'nasa-blue': '#0B3D91',
        'nasa-light-blue': '#1051c4',
        'nasa-red': '#FC3D21',
        'nasa-gray': {
          100: tone('nasa-gray-100'),
          200: tone('nasa-gray-200'),
          300: tone('nasa-gray-300'),
          400: tone('nasa-gray-400'),
          500: tone('nasa-gray-500'),
          600: tone('nasa-gray-600'),
          700: tone('nasa-gray-700'),
          800: tone('nasa-gray-800'),
          900: tone('nasa-gray-900'),
        },
      },
    },
  },
};
