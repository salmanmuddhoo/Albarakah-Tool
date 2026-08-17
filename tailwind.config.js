/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        albarakah: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          500: '#0f766e',
          600: '#0d5f58',
          700: '#0b4f49',
          800: '#083f3a',
          900: '#062e2b',
        },
      },
    },
  },
  plugins: [],
};
