import { GLOSSARY } from '../data/heritage.js';
import { h, svg } from '../core/dom.js';

/** Archimedean spiral for the hairspring: radius grows from r0 to r1 over `turns` turns. */
function spiral(r0, r1, turns, cx = 120, cy = 120) {
  const n = Math.round(turns * 48);
  let d = '';
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * t;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`;
  }
  return d;
}

function balanceFigure() {
  const wheel = svg(
    'g',
    { class: 'fig__balance' },
    svg('circle', { cx: 120, cy: 120, r: 92, class: 'fig__line fig__line--bold' }),
    svg('circle', { cx: 120, cy: 120, r: 84, class: 'fig__line' }),
    ...[0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      return svg('line', { x1: 120, y1: 120, x2: (120 + Math.cos(a) * 88).toFixed(2), y2: (120 + Math.sin(a) * 88).toFixed(2), class: 'fig__line' });
    }),
    svg('path', { d: spiral(10, 56, 5.5), class: 'fig__line fig__line--accent' }),
    svg('circle', { cx: 120, cy: 120, r: 6, class: 'fig__fill' }),
  );
  return svg('svg', { viewBox: '0 0 240 240', class: 'fig', role: 'img', 'aria-label': 'A balance wheel with its hairspring, swinging back and forth' }, wheel);
}

function rotorFigure() {
  // a half-disc weight that swings on its pivot, inside the case outline
  const weight = svg(
    'g',
    { class: 'fig__rotor' },
    svg('path', { d: 'M120 120 m-86 0 a86 86 0 0 1 172 0 z', class: 'fig__line fig__line--bold fig__tint' }),
    svg('circle', { cx: 120, cy: 120, r: 7, class: 'fig__fill' }),
  );
  return svg(
    'svg',
    { viewBox: '0 0 240 240', class: 'fig', role: 'img', 'aria-label': 'An automatic winding rotor swinging on its pivot' },
    svg('circle', { cx: 120, cy: 120, r: 104, class: 'fig__line' }),
    weight,
  );
}

export function createCraftView({ el }) {
  const balanceHost = el.querySelector('#fig-balance');
  const rotorHost = el.querySelector('#fig-rotor');
  const glossary = el.querySelector('#glossary');
  const speedBtn = el.querySelector('#btn-speed');
  let built = false;

  return {
    enter() {
      if (built) return;
      built = true;
      balanceHost.replaceChildren(balanceFigure());
      rotorHost.replaceChildren(rotorFigure());
      glossary.replaceChildren(
        ...GLOSSARY.map((g) =>
          h(
            'li',
            { class: 'gl' },
            h('span', { class: 'gl__jp font-display', lang: 'ja', text: g.jp }),
            h('span', { class: 'gl__ro', text: g.ro }),
            h('h3', { class: 'gl__en font-display', text: g.en }),
            h('p', { class: 'gl__note', text: g.note }),
          ),
        ),
      );
      speedBtn?.addEventListener('click', () => {
        const real = balanceHost.dataset.speed !== 'real';
        balanceHost.dataset.speed = real ? 'real' : 'slow';
        speedBtn.setAttribute('aria-pressed', String(real));
        speedBtn.querySelector('span').textContent = real ? 'Slow it down' : 'Show real speed';
      });
    },
  };
}
