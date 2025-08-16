/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,vue,svelte}',
    './public/**/*.html'
  ],
  theme: {
    extend: {},
  },
  safelist: [
    // Safelist dynamic color classes used in films grid
    // Adjust this set if you add more colors
    { pattern: /(bg|border|text)-(amber|sky|emerald|stone)-(50|400|800|900)/ },
  ],
  plugins: [],
};

