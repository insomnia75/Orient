import gsap from 'gsap';
import { WATCHES, SERIES } from '../data/watches.js';
import { PART_TERMS } from '../data/heritage.js';
import { drawDial } from '../watch/dial-texture.js';
import { bindSpotlight } from '../core/spotlight.js';
import { initMagnetic } from '../core/magnetic.js';
import { REDUCED, dur, webglAvailable } from '../core/motion.js';
import { DEFAULT_ACCENT } from '../config.js';
import { createDrawer } from './drawer.js';

const fontsReady = () =>
  Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);

/**
 * Showcase controller: owns state (selected watch, colourway, filter, exploded view),
 * renders the rail / filters / info panel from data, and drives whichever stage loaded.
 */
export async function createShowcase({ root, scroll }) {
  const $ = (sel) => root.querySelector(sel);
  const els = {
    stage: $('#stage'),
    canvas: $('#watch-canvas'),
    fallback: $('#watch-fallback'),
    hotspots: $('#hotspots'),
    hint: $('#stage-hint'),
    series: $('#info-series'),
    name: $('#showcase-title'),
    tagline: $('#info-tagline'),
    variants: $('#info-variants'),
    variantName: $('#info-variant-name'),
    stats: $('#info-stats'),
    explode: $('#btn-explode'),
    page: $('#btn-page'),
    partCard: $('#part-card'),
    partJp: $('#part-jp'),
    partTitle: $('#part-title'),
    partBody: $('#part-body'),
    partClose: $('#part-close'),
    filters: $('#rail-filters'),
    list: $('#rail-list'),
  };

  const state = { id: WATCHES[0].id, variant: 0, filter: 'all', part: null, seq: 0 };
  const byId = (id) => WATCHES.find((w) => w.id === id);
  const seriesLabel = (id) => SERIES.find((s) => s.id === id)?.label ?? id;

  await fontsReady();

  const drawer = createDrawer({
    root: document.querySelector('#drawer'),
    inertTargets: [document.querySelector('#main'), document.querySelector('#nav')].filter(Boolean),
    scroll,
  });

  // ── rail + filters ────────────────────────────────────────────
  const thumbs = new Map();

  function renderFilters() {
    els.filters.replaceChildren(
      ...SERIES.map((s) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.dataset.series = s.id;
        b.textContent = s.label;
        b.setAttribute('aria-pressed', String(s.id === state.filter));
        return b;
      }),
    );
  }

  function renderRail() {
    els.list.replaceChildren(
      ...WATCHES.map((w) => {
        const li = document.createElement('li');
        li.dataset.series = w.series;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rail__item';
        btn.dataset.id = w.id;
        btn.dataset.cursor = 'View';
        btn.setAttribute('data-spotlight', '');
        btn.setAttribute('aria-pressed', 'false');

        const frame = document.createElement('span');
        frame.className = 'rail__dial';
        if (w.image) {
          const img = document.createElement('img');
          img.src = w.image;
          img.alt = '';
          frame.append(img);
        } else {
          const canvas = document.createElement('canvas');
          drawDial(canvas, w, w.variants[0], { size: 192 });
          frame.append(canvas);
          thumbs.set(w.id, canvas);
        }

        const meta = document.createElement('span');
        meta.className = 'rail__meta';
        const name = document.createElement('span');
        name.className = 'rail__name font-display';
        name.textContent = w.name;
        const series = document.createElement('span');
        series.className = 'rail__series';
        series.textContent = seriesLabel(w.series);
        meta.append(name, series);

        btn.append(frame, meta);
        li.append(btn);
        bindSpotlight(btn);
        return li;
      }),
    );
  }

  function applyFilter(filter) {
    state.filter = filter;
    els.filters.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.series === filter)));
    const visible = [];
    els.list.querySelectorAll('li').forEach((li) => {
      const show = filter === 'all' || li.dataset.series === filter;
      li.hidden = !show;
      if (show) visible.push(li);
    });
    gsap.fromTo(visible, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: dur(0.5), stagger: dur(0.06), ease: 'power3.out' });
    const current = byId(state.id);
    if (filter !== 'all' && current.series !== filter) {
      const first = WATCHES.find((w) => w.series === filter);
      if (first) select(first.id);
    }
  }

  // ── stage ─────────────────────────────────────────────────────
  async function mountStage() {
    try {
      if (!webglAvailable()) throw new Error('WebGL unavailable');
      const { createWatchStage } = await import('./stage.js');
      return await createWatchStage({
        canvas: els.canvas,
        container: els.stage,
        hotspotLayer: els.hotspots,
        onHotspot: openPart,
      });
    } catch (err) {
      console.warn('[showcase] 3D stage unavailable, using the 2D view.', err);
      els.canvas.hidden = true;
      const { createFallbackStage } = await import('./fallback-stage.js');
      return createFallbackStage({ canvas: els.fallback, container: els.stage });
    }
  }
  const stage = await mountStage();
  if (!stage.capabilities.explode) els.explode.hidden = true;
  if (stage.kind === '2d') els.hint.textContent = 'Showing a 2D view. Open this page in a browser with WebGL for the 3D stage.';

  // ── info panel ────────────────────────────────────────────────
  function renderVariants(watch) {
    els.variants.replaceChildren(
      ...watch.variants.map((v, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'swatch';
        b.style.setProperty('--sw', v.dial);
        b.dataset.index = String(i);
        b.dataset.cursor = v.name;
        b.setAttribute('aria-label', `${v.name} dial`);
        b.setAttribute('aria-pressed', String(i === state.variant));
        return b;
      }),
    );
    els.variantName.textContent = watch.variants[state.variant].name;
  }

  function renderStats(watch) {
    els.stats.replaceChildren(
      ...watch.stats.map((s) => {
        const wrap = document.createElement('div');
        const dd = document.createElement('dd');
        dd.className = 'font-display';
        dd.textContent = s.value;
        const dt = document.createElement('dt');
        dt.textContent = s.label;
        wrap.append(dd, dt);
        return wrap;
      }),
    );
  }

  function paintText(watch) {
    els.series.textContent = seriesLabel(watch.series);
    els.name.textContent = watch.name;
    els.tagline.textContent = watch.tagline;
    els.page.setAttribute('href', `#watch-${watch.id}`);
    renderStats(watch);
  }

  function setAccent(variant) {
    const color = variant.accent ?? DEFAULT_ACCENT;
    document.documentElement.style.setProperty('--accent', color);
    stage.setAccent(color);
  }

  function syncRail() {
    els.list.querySelectorAll('.rail__item').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === state.id)));
    const w = byId(state.id);
    const canvas = thumbs.get(w.id);
    if (canvas) drawDial(canvas, w, w.variants[state.variant], { size: 192 });
  }

  function setExplodeButton(on) {
    els.explode.setAttribute('aria-pressed', String(on));
    els.explode.querySelector('span').textContent = on ? 'Assemble' : 'Exploded view';
  }

  function closePartCard() {
    state.part = null;
    els.partCard.hidden = true;
  }

  // ── actions ───────────────────────────────────────────────────
  async function select(id, variantIndex = 0, { initial = false } = {}) {
    const watch = byId(id);
    if (!watch) return;
    const changed = id !== state.id || initial;
    const seq = ++state.seq;
    state.id = id;
    state.variant = variantIndex;

    closePartCard();
    setExplodeButton(false);
    syncRail();
    renderVariants(watch);
    setAccent(watch.variants[variantIndex]);
    drawer.setContent(watch, variantIndex);

    if (changed && !initial) {
      const targets = [els.series, els.name, els.tagline, els.stats];
      await gsap.to(targets, { opacity: 0, y: -10, duration: dur(0.2), stagger: dur(0.03), ease: 'power2.in' });
      if (seq !== state.seq) return;
      paintText(watch);
      gsap.fromTo(targets, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: dur(0.6), stagger: dur(0.06), ease: 'power3.out' });
    } else {
      paintText(watch);
    }

    stage.setWatch(watch, variantIndex, { animate: !initial });
  }

  function selectVariant(index) {
    const watch = byId(state.id);
    if (index === state.variant) return;
    state.variant = index;
    closePartCard();
    setExplodeButton(false);
    renderVariants(watch);
    setAccent(watch.variants[index]);
    drawer.setContent(watch, index);
    syncRail();
    stage.setWatch(watch, index, { animate: true });
  }

  async function openPart(id) {
    const watch = byId(state.id);
    const part = watch.parts?.[id];
    if (!part) return;
    state.part = id;
    els.partJp.textContent = PART_TERMS[id] ? `${PART_TERMS[id].jp}  ${PART_TERMS[id].ro}` : '';
    els.partTitle.textContent = part.title;
    els.partBody.textContent = part.body;
    els.partCard.hidden = false;
    gsap.fromTo(els.partCard, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: dur(0.5), ease: 'power3.out' });
    const result = await stage.focusPart(id);
    if (state.part === id) setExplodeButton(!!result?.exploded);
  }

  async function closePart() {
    if (!state.part) return;
    closePartCard();
    const result = await stage.focusPart(null);
    setExplodeButton(!!result?.exploded);
  }

  // ── events ────────────────────────────────────────────────────
  els.filters.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) applyFilter(chip.dataset.series);
  });

  els.list.addEventListener('click', (e) => {
    const btn = e.target.closest('.rail__item');
    if (btn && btn.dataset.id !== state.id) select(btn.dataset.id);
  });

  els.list.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const items = [...els.list.querySelectorAll('li:not([hidden]) .rail__item')];
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    items[(i + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length].focus();
  });

  els.variants.addEventListener('click', (e) => {
    const sw = e.target.closest('.swatch');
    if (sw) selectVariant(Number(sw.dataset.index));
  });

  els.explode.addEventListener('click', async () => {
    const on = els.explode.getAttribute('aria-pressed') !== 'true';
    setExplodeButton(on);
    closePartCard();
    state.part = null;
    await stage.setExploded(on);
  });

  els.partClose.addEventListener('click', closePart);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.isOpen && state.part) closePart();
  });

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-drawer]');
    if (trigger) drawer.open(trigger);
  });

  els.stage.addEventListener(
    'pointerdown',
    () => {
      els.hint.classList.add('is-gone');
    },
    { once: true },
  );

  // ── boot ──────────────────────────────────────────────────────
  renderFilters();
  renderRail();
  initMagnetic(root);
  await select(WATCHES[0].id, 0, { initial: true });

  return {
    select,
    stage,
    get state() {
      return state;
    },
    destroy() {
      stage.destroy();
    },
  };
}
