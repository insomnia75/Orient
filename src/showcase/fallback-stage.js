import { renderWatchBase, paintHands, paintGlass, scaleFor } from '../watch/watch-2d.js';
import { beats, REDUCED } from '../core/motion.js';

/**
 * 2D stand-in for the 3D stage, with the same interface. Used when WebGL or the 3D libraries
 * are unavailable, and as the live face on each model page. Draws the whole watch from data and
 * moves the hands in real time; the seconds hand steps six times a second, like the calibre.
 *
 * The strap, case and dial are painted once into a base layer (per size and colourway); each
 * tick repaints only the hands and the glass.
 */
export function createFallbackStage({ canvas, container, fill = false }) {
  canvas.hidden = false;
  const ctx = canvas.getContext('2d');
  let watch = null;
  let variant = null;
  let base = null;
  let baseKey = '';
  let timer = 0;
  let alive = true;

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = container.clientWidth || 600;
    const cssH = container.clientHeight || 600;
    const pw = Math.round(cssW * dpr);
    const ph = Math.round(cssH * dpr);
    // resizing a canvas reallocates it, so only do it when the size really changed
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    const w = canvas.width;
    const h = canvas.height;
    if (fill) return { S: Math.min(w, h), cx: w / 2, cy: h / 2, w, h };
    // showcase: leave room for the info panel on the left and the rail below
    const shift = cssW > 900 ? w * 0.12 : 0;
    const S = Math.round(Math.min(w * (cssW > 900 ? 0.62 : 0.95), h * 0.8));
    return { S, cx: w / 2 + shift, cy: h * 0.44, w, h };
  }

  function paint() {
    if (!watch || !alive) return;
    const { S, cx, cy, w, h } = layout();
    const key = `${watch.id}:${variant.id}:${S}`;
    if (key !== baseKey) {
      base = renderWatchBase(watch, variant, S);
      baseKey = key;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(base, Math.round(cx - S / 2), Math.round(cy - S / 2));
    const now = new Date();
    const sec = now.getSeconds() + now.getMilliseconds() / 1000;
    const stepped = REDUCED ? Math.floor(sec) : beats(sec) / 6;
    const at = { cx: Math.round(cx - S / 2) + S / 2, cy: Math.round(cy - S / 2) + S / 2, k: scaleFor(watch, S), time: [now.getHours(), now.getMinutes(), stepped] };
    paintHands(ctx, watch, variant, at);
    paintGlass(ctx, watch, at);
  }

  function setWatch(w, variantIndex = 0) {
    watch = w;
    variant = w.variants[variantIndex] ?? w.variants[0];
    baseKey = '';
    paint();
    clearInterval(timer);
    // with reduced motion the hands still keep time, once a second and without the snap
    timer = setInterval(paint, REDUCED ? 1000 : 1000 / 6);
    return Promise.resolve();
  }

  const ro = new ResizeObserver(paint);
  ro.observe(container);
  const onVis = () => {
    clearInterval(timer);
    if (!document.hidden && watch) timer = setInterval(paint, REDUCED ? 1000 : 1000 / 6);
  };
  document.addEventListener('visibilitychange', onVis);

  return {
    kind: '2d',
    capabilities: { explode: false, hotspots: false },
    setWatch,
    setExploded: () => Promise.resolve(),
    focusPart: () => Promise.resolve({ exploded: false }),
    setAccent() {},
    destroy() {
      alive = false;
      clearInterval(timer);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    },
  };
}
