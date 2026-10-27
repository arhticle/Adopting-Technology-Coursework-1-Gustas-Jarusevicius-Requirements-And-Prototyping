/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Dark mode follows the data-theme attribute that App.jsx sets on <html>
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // The colours now point at CSS variables (defined in src/index.css) so they change with
        // light, dark and colourblind mode. Light-mode defaults are: feature green, bug red.
        feature: 'var(--feature)',
        bug: 'var(--bug)',
      },
    },
  },
  plugins: [],
};