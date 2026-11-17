import { WATCHES, SERIES } from '../data/watches.js';
import { PART_TERMS, PART_LABELS } from '../data/heritage.js';
import { h } from '../core/dom.js';
import { drawWatchFace } from '../watch/face-2d.js';
import { bindSpotlight } from '../core/spotlight.js';
import { createFallbackStage } from '../showcase/fallback-stage.js';
import { initMagnetic } from '../core/magnetic.js';

const seriesOf = (w) => SERIES.find((s) => s.id === w.series);

/** One page per model, rendered from data: live face, story, anatomy with Japanese terms, specs. */
export function createWatchView({ el, onOpen3d }) {
  const root = el.querySelector('#watch-root');
  let stage = null;

  function destroyStage() {
    stage?.destroy();
    stage = null;
  }

  function neighbour(w, dir) {
    const i = WATCHES.indexOf(w);
    return WATCHES[(i + dir + WATCHES.length) % WATCHES.length];
  }

  function nextLink(w, label, dir) {
    const n = neighbour(w, dir);
    const c = h('canvas', { 'aria-hidden': 'true' });
    drawWatchFace(c, n, n.variants[0], { size: 192, zoom: 1.7 });
    return h(
      'a',
      { class: `next next--${dir > 0 ? 'fwd' : 'back'}`, href: `#watch-${n.id}`, 'data-cursor': 'Open' },
      h('span', { class: 'next__dial' }, c),
      h('span', { class: 'next__text' }, h('span', { class: 'next__label', text: label }), h('span', { class: 'next__name font-display', text: n.name })),
    );
  }

  function render(w) {
    let variantIndex = 0;
    const face = h(
      'div',
      { class: 'wd__face', 'data-spotlight': '' },
      w.image
        ? h('img', { src: w.image, alt: `${w.name} watch`, decoding: 'async' })
        : h('canvas', { 'aria-label': `${w.name} watch face`, role: 'img' }),
    );
    bindSpotlight(face);
    const refEl = h('p', { class: 'wd__ref' });
    const nameEl = h('p', { class: 'wd__variant' });
    const swatches = h('div', { class: 'info__variants', role: 'group', 'aria-label': 'Colourway' });

    function paintVariant() {
      const v = w.variants[variantIndex];
      root.style.setProperty('--accent', v.accent ?? '#e9dcb0');
      nameEl.textContent = v.name;
      refEl.textContent = v.ref ? `Reference ${v.ref}` : '';
      swatches.querySelectorAll('.swatch').forEach((b, i) => b.setAttribute('aria-pressed', String(i === variantIndex)));
      stage?.setWatch(w, variantIndex);
    }
    swatches.replaceChildren(
      ...w.variants.map((v, i) =>
        h('button', {
          type: 'button',
          class: 'swatch',
          style: `--sw:${v.dial}`,
          'aria-label': `${v.name} dial`,
          'data-cursor': v.name,
          onClick: () => {
            variantIndex = i;
            paintVariant();
          },
        }),
      ),
    );

    const stats = h('dl', { class: 'info__stats' }, w.stats.map((s) => h('div', {}, h('dd', { class: 'font-display', text: s.value }), h('dt', { text: s.label }))));

    const anatomy = Object.entries(w.parts ?? {}).map(([id, part]) => {
      const term = PART_TERMS[id];
      return h(
        'li',
        { class: 'part' },
        h('span', { class: 'part__jp font-display', lang: 'ja', text: term?.jp ?? '' }),
        h('span', { class: 'part__ro', text: term ? `${term.ro}, ${PART_LABELS[id].toLowerCase()}` : PART_LABELS[id] }),
        h('h3', { class: 'part__title font-display', text: part.title }),
        h('p', { class: 'part__body', text: part.body }),
      );
    });

    // replaceChildren() would print a null child as the text "null", so optional sections are filtered out
    const sections = [
      h(
        'header',
        { class: 'wd' },
        h(
          'div',
          { class: 'wd__copy' },
          h('p', { class: 'wd__crumb' }, h('a', { href: '#collection', text: 'Collection' }), ` / ${seriesOf(w).label}`),
          h('h1', { class: 'wd__name font-display', text: w.name }),
          h('p', { class: 'wd__jp font-display', lang: 'ja', text: w.jp }),
          h('p', { class: 'wd__tag', text: w.tagline }),
          swatches,
          nameEl,
          refEl,
          stats,
          h(
            'div',
            { class: 'info__actions' },
            h('button', { type: 'button', class: 'btn', 'data-magnetic': '0.2', onClick: () => onOpen3d(w.id, variantIndex) }, h('span', { 'data-magnetic-inner': '', text: 'View in 3D' })),
            h('a', { class: 'btn btn--ghost', href: '#collection' }, h('span', { text: 'All models' })),
          ),
        ),
        face,
      ),
      h(
        'section',
        { class: 'wd-story', 'aria-labelledby': 'wd-story-title' },
        h('h2', { id: 'wd-story-title', class: 'wd-h font-display', text: 'The watch' }),
        h('div', { class: 'wd-story__text' }, w.story.map((p) => h('p', { text: p }))),
      ),
      w.gallery?.length
        ? h(
            'section',
            { class: 'wd-gallery', 'aria-label': `${w.name} photographs` },
            w.gallery.map((g) => h('img', { src: g.src, alt: g.alt ?? '', loading: 'lazy', decoding: 'async' })),
          )
        : null,
      h(
        'section',
        { class: 'wd-anatomy', 'aria-labelledby': 'wd-anat-title' },
        h('h2', { id: 'wd-anat-title', class: 'wd-h font-display', text: 'Anatomy, in Japanese and English' }),
        h('ul', { class: 'parts' }, anatomy),
      ),
      h(
        'section',
        { class: 'wd-specs', 'aria-labelledby': 'wd-specs-title' },
        h('h2', { id: 'wd-specs-title', class: 'wd-h font-display', text: 'Specifications' }),
        h('dl', { class: 'specs' }, w.specs.flatMap((s) => [h('dt', { text: s.label }), h('dd', { text: s.value })])),
        h('p', { class: 'wd-note', text: 'Figures come from public listings. Check them against the current Orient range before you rely on them.' }),
      ),
      h('nav', { class: 'wd-next', 'aria-label': 'Other models' }, nextLink(w, 'Previous', -1), nextLink(w, 'Next', 1)),
    ];
    root.replaceChildren(...sections.filter(Boolean));

    // live 2D face, created only once its container is on screen
    if (!w.image) stage = createFallbackStage({ canvas: face.querySelector('canvas'), container: face, fill: true });
    paintVariant();
    initMagnetic(root);
  }

  return {
    enter(route) {
      const w = WATCHES.find((x) => x.id === route.id);
      if (!w) return false;
      destroyStage();
      render(w);
      return true;
    },
    leave() {
      destroyStage();
      root.replaceChildren();
    },
  };
}
