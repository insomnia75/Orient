import { WATCHES, SERIES } from '../data/watches.js';
import { h } from '../core/dom.js';
import { drawWatchFace } from '../watch/face-2d.js';
import { bindSpotlight } from '../core/spotlight.js';

const spec = (w, label) => w.specs.find((s) => s.label === label)?.value ?? '';

/** Collection page: filter tabs, one card per model, and a side-by-side table. */
export function createCollectionView({ el }) {
  const tabs = el.querySelector('#coll-tabs');
  const grid = el.querySelector('#coll-grid');
  const table = el.querySelector('#coll-table');
  let built = false;
  let filter = 'all';

  function card(w) {
    // a real photo (w.image) wins over the face drawn in code
    const canvas = w.image
      ? h('img', { class: 'card__canvas', src: w.image, alt: '', loading: 'lazy', decoding: 'async' })
      : h('canvas', { class: 'card__canvas', 'aria-hidden': 'true' });
    if (!w.image) drawWatchFace(canvas, w, w.variants[0], { size: 600, zoom: 1.3 });
    const dots = h(
      'span',
      { class: 'card__dots', 'aria-hidden': 'true' },
      w.variants.map((v) => h('i', { style: `--sw:${v.dial}` })),
    );
    const stats = h(
      'dl',
      { class: 'card__stats' },
      w.stats.map((s) => h('div', {}, h('dd', { class: 'font-display', text: s.value }), h('dt', { text: s.label }))),
    );
    const a = h(
      'a',
      { class: 'card', href: `#watch-${w.id}`, 'data-cursor': 'Open', 'data-spotlight': '', 'aria-label': `${w.name}, ${w.tagline}` },
      h('span', { class: 'card__dial' }, canvas),
      h(
        'span',
        { class: 'card__body' },
        h('span', { class: 'card__jp', lang: 'ja', text: w.jp }),
        h('h2', { class: 'card__name font-display', text: w.name }),
        h('span', { class: 'card__series', text: SERIES.find((s) => s.id === w.series)?.label }),
        h('span', { class: 'card__tag', text: w.tagline }),
        dots,
        stats,
      ),
    );
    bindSpotlight(a);
    return h('li', { dataset: { series: w.series } }, a);
  }

  function applyFilter(next) {
    filter = next;
    tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.series === next)));
    grid.querySelectorAll('li').forEach((li) => {
      li.hidden = next !== 'all' && li.dataset.series !== next;
    });
  }

  function buildTable() {
    const rows = [
      ['Case', (w) => w.stats.find((s) => s.label === 'Case')?.value],
      ['Water resistance', (w) => w.stats.find((s) => s.label === 'Water resistance')?.value],
      ['Power reserve', (w) => w.stats.find((s) => s.label === 'Power reserve')?.value],
      ['Crystal', (w) => spec(w, 'Crystal')],
      ['Movement', (w) => w.parts?.movement?.title ?? ''],
    ];
    table.replaceChildren(
      h(
        'thead',
        {},
        h('tr', {}, h('td'), ...WATCHES.map((w) => h('th', { scope: 'col' }, h('a', { href: `#watch-${w.id}`, text: w.name })))),
      ),
      h(
        'tbody',
        {},
        rows.map(([label, get]) => h('tr', {}, h('th', { scope: 'row', text: label }), ...WATCHES.map((w) => h('td', { text: get(w) })))),
      ),
    );
  }

  return {
    enter() {
      if (built) return;
      built = true;
      tabs.replaceChildren(
        ...SERIES.map((s) =>
          h('button', { type: 'button', class: 'tab', dataset: { series: s.id }, 'aria-pressed': String(s.id === filter), onClick: () => applyFilter(s.id) }, s.label, h('span', { class: 'tab__jp', lang: 'ja', text: s.jp })),
        ),
      );
      grid.replaceChildren(...WATCHES.map(card));
      buildTable();
    },
  };
}
