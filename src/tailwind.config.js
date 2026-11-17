// Optional: Tailwind via the CLI. The site itself is styled by src/styles/*.css and does not need it.
// Why not the Play CDN: it re-scans the DOM on every change, which costs frames on a page this dynamic.
// To use utilities in new sections:
//   npm i -D tailwindcss@3
//   npm run build:css      (see package.json), then link dist/tailwind.css in index.html
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.js'],
  theme: {
    extend: {
      colors: {
        ink: '#111214', // sumi
        'ink-2': '#17191c',
        gofun: '#ebe6da',
        paper: '#e7e1d2', // washi
        hanko: '#a63a2f',
        accent: 'var(--accent)',
      },
      fontFamily: {
        display: ['"Shippori Mincho"', '"Hiragino Mincho ProN"', 'Georgia', 'serif'],
        body: ['"Zen Kaku Gothic New"', 'system-ui', 'sans-serif'],
      },
    },
  },
};
