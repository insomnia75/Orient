/**
 * A front-on product drawing of a whole watch: strap, lugs, case, bezel, crown, dial, hands and
 * glass, painted on a 2D canvas from the same data as the 3D model (data/watches.js).
 *
 * Used wherever a live WebGL stage would be too heavy or is unavailable: collection cards, the
 * model page, the "next model" links and the 2D fallback of the showcase.
 *
 * Everything is measured in millimetres and scaled by `k` (pixels per mm), so a 38 mm Bambino
 * draws smaller than a 42.5 mm Sun & Moon. Light comes from the upper left, as in the 3D scene.
 * The slow parts (strap grain, metal, dial) are painted once into a base layer; per frame only
 * the hands and the glass are drawn.
 */
import { drawDial, drawBezelInsert } from './dial-texture.js';
import { SMALL_SECONDS, hasSmallSeconds } from './dial-layout.js';

const TAU = Math.PI * 2;
/** Diameter that fills the reference share of the canvas; smaller cases draw smaller. */
const REF_DIAMETER = 42.5;
const LIGHT = [-0.6, -0.8]; // unit vector toward the light, canvas axes (y down)

// ── colour helpers ────────────────────────────────────────────
function hexToRgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Mix a colour toward white (t > 0) or black (t < 0); `a` is the alpha. */
function shade(hex, t, a = 1) {
  const [r, g, b] = hexToRgb(hex);
  const to = t > 0 ? 255 : 0;
  const k = Math.min(1, Math.abs(t));
  const m = (c) => Math.round(c + (to - c) * k);
  return a < 1 ? `rgba(${m(r)},${m(g)},${m(b)},${a})` : `rgb(${m(r)},${m(g)},${m(b)})`;
}
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

/** Seeded random numbers, so grain and brushing never shimmer between redraws. */
function rng(seed = 987654321) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Case and bezel proportions in mm, matching build-watch.js so both views agree. */
export function watchGeometry(watch) {
  const c = watch.case;
  const R = c.diameter / 2;
  const dive = watch.bezel?.type === 'dive120';
  const Ri = R - 2.2;
  const opening = dive ? R - 6.0 : R - 2.7;
  const Rdial = Math.min(opening + 0.4, Ri - 0.05);
  return { R, dive, opening, Rdial, lugW: c.lugWidth, l2l: c.lugToLug, lugT: Math.max(3.4, c.diameter * 0.095) };
}

// ── strap ─────────────────────────────────────────────────────
function strapPath(ctx, cx, cy, k, g, S) {
  // one band from the top edge of the square to the bottom, tapering by 2 mm away from the lugs
  const w0 = (g.lugW / 2) * k;
  const w1 = ((g.lugW - 2.4) / 2) * k;
  const yLug = (g.l2l / 2) * k;
  ctx.beginPath();
  ctx.moveTo(cx - w1, 0);
  ctx.lineTo(cx + w1, 0);
  ctx.lineTo(cx + w0, cy - yLug);
  ctx.lineTo(cx + w0, cy + yLug);
  ctx.lineTo(cx + w1, S);
  ctx.lineTo(cx - w1, S);
  ctx.lineTo(cx - w0, cy + yLug);
  ctx.lineTo(cx - w0, cy - yLug);
  ctx.closePath();
}

function drawLeather(ctx, cx, cy, k, g, S, def) {
  const color = def.color ?? '#4a3224';
  const w0 = (g.lugW / 2) * k;
  ctx.save();
  strapPath(ctx, cx, cy, k, g, S);
  ctx.clip();
  // rounded padding: darker edges, a soft lit band left of centre
  const across = ctx.createLinearGradient(cx - w0, 0, cx + w0, 0);
  across.addColorStop(0, shade(color, -0.55));
  across.addColorStop(0.07, shade(color, -0.18));
  across.addColorStop(0.32, shade(color, 0.12));
  across.addColorStop(0.62, color);
  across.addColorStop(0.93, shade(color, -0.25));
  across.addColorStop(1, shade(color, -0.6));
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, S, S);
  // grain
  const rnd = rng(31337);
  const n = Math.round((S * S) / 90);
  for (let i = 0; i < n; i++) {
    const x = cx - w0 + rnd() * w0 * 2;
    const y = rnd() * S;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.07)';
    const s = (0.08 + rnd() * 0.16) * k;
    ctx.fillRect(x, y, s, s);
  }
  // stitching, inset from each edge
  if (def.stitch) {
    const inset = 1.7 * k;
    const yLug = (g.l2l / 2) * k;
    ctx.lineWidth = Math.max(1, 0.32 * k);
    ctx.setLineDash([1.25 * k, 0.75 * k]);
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      for (const [ya, yb] of [[cy - yLug - 1.5 * k, -10], [cy + yLug + 1.5 * k, S + 10]]) {
        const xa = cx + side * (w0 - inset);
        const xb = cx + side * (w0 - inset - 1.2 * k);
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.moveTo(xa, ya + 0.15 * k);
        ctx.lineTo(xb, yb + 0.15 * k);
        ctx.stroke();
        ctx.strokeStyle = luminance(color) < 0.2 ? 'rgba(214,206,188,0.62)' : 'rgba(240,232,214,0.78)';
        ctx.beginPath();
        ctx.moveTo(xa, ya);
        ctx.lineTo(xb, yb);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawRubber(ctx, cx, cy, k, g, S, def) {
  const color = def.color ?? '#15171a';
  const w0 = (g.lugW / 2) * k;
  ctx.save();
  strapPath(ctx, cx, cy, k, g, S);
  ctx.clip();
  const across = ctx.createLinearGradient(cx - w0, 0, cx + w0, 0);
  across.addColorStop(0, shade(color, -0.5));
  across.addColorStop(0.3, shade(color, 0.14));
  across.addColorStop(0.7, color);
  across.addColorStop(1, shade(color, -0.5));
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, S, S);
  // moulded grooves
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.5 * k;
  for (let y = cy % (3.2 * k); y < S; y += 3.2 * k) {
    ctx.beginPath();
    ctx.moveTo(cx - w0 * 0.55, y);
    ctx.lineTo(cx + w0 * 0.55, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBracelet(ctx, cx, cy, k, g, S, def) {
  const metal = def.color ?? '#b9bec5';
  const w0 = (g.lugW / 2) * k;
  const yLug = (g.l2l / 2) * k;
  const pitch = 5.2 * k;
  const rnd = rng(4242);
  ctx.save();
  strapPath(ctx, cx, cy, k, g, S);
  ctx.clip();
  ctx.fillStyle = shade(metal, -0.75);
  ctx.fillRect(0, 0, S, S);

  const row = (y0, h, taper) => {
    const half = w0 * taper;
    const outer = half * 0.32; // width of each brushed outer link
    const gap = 0.35 * k;
    // brushed outer links
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? cx - half : cx + half - outer;
      const gr = ctx.createLinearGradient(0, y0, 0, y0 + h);
      gr.addColorStop(0, shade(metal, 0.18));
      gr.addColorStop(0.5, shade(metal, -0.12));
      gr.addColorStop(1, shade(metal, -0.38));
      ctx.fillStyle = gr;
      ctx.fillRect(x0, y0 + gap, outer - gap, h - gap * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = Math.max(0.5, 0.06 * k);
      for (let i = 0; i < 9; i++) {
        const yy = y0 + gap + rnd() * (h - gap * 2);
        ctx.beginPath();
        ctx.moveTo(x0, yy);
        ctx.lineTo(x0 + outer - gap, yy);
        ctx.stroke();
      }
    }
    // polished centre link: a bright, sharp band, like a mirror catching a window
    const cx0 = cx - half + outer;
    const cw = half * 2 - outer * 2;
    const gc = ctx.createLinearGradient(cx0, 0, cx0 + cw, 0);
    gc.addColorStop(0, shade(metal, -0.45));
    gc.addColorStop(0.22, shade(metal, 0.55));
    gc.addColorStop(0.36, shade(metal, 0.1));
    gc.addColorStop(0.7, shade(metal, -0.25));
    gc.addColorStop(1, shade(metal, -0.5));
    ctx.fillStyle = gc;
    ctx.fillRect(cx0 + gap * 0.5, y0 + gap * 0.6, cw - gap, h - gap * 1.2);
  };

  // width of the band at height y, following the same taper as strapPath
  const w1 = ((g.lugW - 2.4) / 2) * k;
  const halfAt = (y) => {
    const d = Math.abs(y - cy);
    if (d <= yLug) return w0;
    const t = Math.min(1, (d - yLug) / Math.max(1, S / 2 - yLug));
    return w0 + (w1 - w0) * t;
  };
  // the end links sit between the lugs; the rest run out to the edges of the square
  row(cy - yLug, pitch, 1);
  row(cy + yLug - pitch, pitch, 1);
  for (let i = 0; i < 80; i++) {
    const yTop = cy - yLug - (i + 1) * pitch;
    const yBot = cy + yLug + i * pitch;
    if (yTop + pitch < 0 && yBot > S) break;
    row(yTop, pitch, halfAt(yTop + pitch / 2) / w0);
    row(yBot, pitch, halfAt(yBot + pitch / 2) / w0);
  }
  ctx.restore();
}

// ── metal parts ───────────────────────────────────────────────
/** Polished ring: a conic sweep of light and dark bands, the way a curved mirror shows a room. */
function polishedRing(ctx, cx, cy, rOut, rIn, metal, strength = 1) {
  const g = ctx.createConicGradient(-Math.PI / 2, cx, cy);
  // 0 is twelve o'clock, going clockwise; the window light sits at about half past ten
  const stops = [
    [0, 0.2], [0.05, -0.25], [0.1, -0.78], [0.17, -0.6], [0.26, 0.05], [0.3, 0.35], [0.34, -0.1],
    [0.44, -0.82], [0.54, -0.7], [0.62, -0.2], [0.7, 0.15], [0.78, 0.5], [0.84, 0.95], [0.88, 0.7], [0.93, 0.3], [1, 0.2],
  ];
  for (const [t, v] of stops) g.addColorStop(t, shade(metal, v * strength));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, TAU);
  ctx.arc(cx, cy, rIn, 0, TAU, true);
  ctx.fill('evenodd');
}

/** A crisp edge highlight where a polished surface turns toward the light. */
function edgeGlint(ctx, cx, cy, r, k, alpha = 0.55) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = Math.max(0.8, 0.32 * k);
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 1.05, Math.PI * 1.45);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.35})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.1, Math.PI * 0.3);
  ctx.stroke();
  ctx.restore();
}

function drawLug(ctx, cx, cy, k, g, sx, sy, metal) {
  const xi = (g.lugW / 2) * k;
  const xo = xi + g.lugT * k;
  const y1 = (g.l2l / 2) * k;
  const R = g.R * k;
  const y0 = Math.sqrt(Math.max(0, R * R - xo * xo)) - 2.5 * k; // tucked under the case
  const tip = xo - 0.7 * k; // lugs narrow a little toward the tip
  const r = 1.5 * k;
  const outline = () => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);
    ctx.beginPath();
    ctx.moveTo(xi, y0);
    ctx.lineTo(xi, y1 - 0.4 * k);
    ctx.quadraticCurveTo(xi, y1, xi + 0.4 * k, y1);
    ctx.lineTo(tip - r, y1);
    ctx.quadraticCurveTo(tip, y1, tip, y1 - r);
    ctx.quadraticCurveTo(xo + 0.2 * k, (y0 + y1) / 2, xo + 0.8 * k, y0);
    ctx.closePath();
    ctx.restore();
  };

  // contact shadow on the strap and ground
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 1.6 * k;
  ctx.shadowOffsetX = 0.5 * k;
  ctx.shadowOffsetY = 1 * k;
  outline();
  ctx.fillStyle = shade(metal, -0.3);
  ctx.fill();
  ctx.restore();

  // shade in screen space so the light stays top-left whichever lug this is
  const xl = cx + sx * xi;
  const xr = cx + sx * xo;
  const left = Math.min(xl, xr);
  const right = Math.max(xl, xr);
  const inner = sx > 0 ? 0 : 1; // which end of the gradient is the inner (strap) edge
  const across = ctx.createLinearGradient(left, 0, right, 0);
  const st = [
    [0, 0.25], [0.1, 0.85], [0.2, 0.2], [0.55, -0.15], [0.86, -0.5], [1, -0.7],
  ];
  for (const [t, v] of st) across.addColorStop(inner ? 1 - t : t, shade(metal, v + (sx < 0 ? 0.08 : -0.05)));
  outline();
  ctx.fillStyle = across;
  ctx.fill();
  // the lugs curve down toward the wrist: darker toward the tip; lower lugs face away from the light
  const along = ctx.createLinearGradient(0, cy + sy * y0, 0, cy + sy * y1);
  along.addColorStop(0, 'rgba(0,0,0,0)');
  along.addColorStop(0.6, `rgba(0,0,0,${sy < 0 ? 0.08 : 0.2})`);
  along.addColorStop(1, `rgba(0,0,0,${sy < 0 ? 0.3 : 0.5})`);
  ctx.fillStyle = along;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = Math.max(0.6, 0.12 * k);
  ctx.stroke();
}

function drawCrown(ctx, cx, cy, k, g, watch, metal) {
  const R = g.R * k;
  const guards = watch.case.crownGuards;
  // shoulders that protect the crown on divers
  if (guards) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      const yA = s * 2.9 * k;
      const yB = s * 6.6 * k;
      ctx.moveTo(cx + R - 1.2 * k, cy + yB);
      ctx.quadraticCurveTo(cx + R + 2.6 * k, cy + yB, cx + R + 3.3 * k, cy + s * 4.2 * k);
      ctx.lineTo(cx + R + 3.3 * k, cy + yA);
      ctx.lineTo(cx + R - 1.2 * k, cy + yA);
      ctx.closePath();
      const gr = ctx.createLinearGradient(0, cy + Math.min(yA, yB), 0, cy + Math.max(yA, yB));
      gr.addColorStop(0, shade(metal, s < 0 ? 0.55 : 0.05));
      gr.addColorStop(1, shade(metal, s < 0 ? -0.05 : -0.5));
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = Math.max(0.6, 0.12 * k);
      ctx.stroke();
    }
  }
  // stem, then the knurled head
  const stemH = 2.6 * k;
  const sg = ctx.createLinearGradient(0, cy - stemH / 2, 0, cy + stemH / 2);
  sg.addColorStop(0, shade(metal, 0.5));
  sg.addColorStop(1, shade(metal, -0.5));
  ctx.fillStyle = sg;
  ctx.fillRect(cx + R - 1 * k, cy - stemH / 2, 2.8 * k, stemH);

  const x0 = cx + R + 1.5 * k;
  const w = 3.5 * k;
  const h = 5.2 * k;
  const y0 = cy - h / 2;
  const hg = ctx.createLinearGradient(0, y0, 0, y0 + h);
  hg.addColorStop(0, shade(metal, 0.25));
  hg.addColorStop(0.28, shade(metal, 0.8));
  hg.addColorStop(0.55, shade(metal, -0.1));
  hg.addColorStop(1, shade(metal, -0.6));
  ctx.beginPath();
  ctx.roundRect(x0, y0, w, h, 0.9 * k);
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // knurling: alternating fine ridges
  const ridge = 0.42 * k;
  for (let y = y0; y < y0 + h; y += ridge) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x0 + 0.5 * k, y, w - 0.5 * k, ridge * 0.45);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x0 + w - 0.7 * k, y0, 0.7 * k, h); // the crown face turns away from the light
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = Math.max(0.6, 0.12 * k);
  ctx.stroke();
}

function drawCoinEdge(ctx, cx, cy, rOut, rIn, metal, k) {
  // 120 teeth round the dive bezel, each lit according to where it faces
  const n = 120;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU;
    const a1 = ((i + 0.55) / n) * TAU;
    const mid = (a0 + a1) / 2;
    const lit = Math.cos(mid) * LIGHT[0] + Math.sin(mid) * LIGHT[1];
    ctx.fillStyle = shade(metal, lit * 0.6 - 0.05);
    ctx.beginPath();
    ctx.arc(cx, cy, rOut, a0, a1);
    ctx.arc(cx, cy, rIn, a1, a0, true);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = Math.max(0.6, 0.1 * k);
  ctx.beginPath();
  ctx.arc(cx, cy, rOut, 0, TAU);
  ctx.stroke();
}

/**
 * Paint everything that does not move: strap, lugs, case, bezel, crown and dial.
 * @returns {HTMLCanvasElement} an S×S canvas; the case centre is at (S/2, S/2)
 */
export function renderWatchBase(watch, variant, S, { date = new Date(), zoom = 1 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const g = watchGeometry(watch);
  const k = scaleFor(watch, S, zoom);
  const cx = S / 2;
  const cy = S / 2;
  const metal = watch.case.metal ?? '#c8ccd2';
  const strapDef = { ...watch.strap, ...(variant.strap ?? {}) };

  // strap on its own layer, so it can fade out toward the edges of the square
  const strapLayer = document.createElement('canvas');
  strapLayer.width = strapLayer.height = S;
  const sctx = strapLayer.getContext('2d');
  if (strapDef.type === 'bracelet') drawBracelet(sctx, cx, cy, k, g, S, strapDef);
  else if (strapDef.type === 'rubber') drawRubber(sctx, cx, cy, k, g, S, strapDef);
  else drawLeather(sctx, cx, cy, k, g, S, strapDef);
  // the case throws a soft shadow onto the strap below it
  const sh = sctx.createRadialGradient(cx + 1.2 * k, cy + 2.2 * k, g.R * k * 0.9, cx + 1.2 * k, cy + 2.2 * k, g.R * k * 1.55);
  sh.addColorStop(0, 'rgba(0,0,0,0.55)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.globalCompositeOperation = 'source-atop';
  sctx.fillStyle = sh;
  sctx.fillRect(0, 0, S, S);
  sctx.globalCompositeOperation = 'destination-in';
  const fade = sctx.createLinearGradient(0, 0, 0, S);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(0.16, 'rgba(0,0,0,1)');
  fade.addColorStop(0.84, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = fade;
  sctx.fillRect(0, 0, S, S);
  ctx.drawImage(strapLayer, 0, 0);

  // lugs, then the case over them
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) drawLug(ctx, cx, cy, k, g, sx, sy, metal);
  drawCrown(ctx, cx, cy, k, g, watch, metal);

  const R = g.R * k;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 3.2 * k;
  ctx.shadowOffsetX = 0.8 * k;
  ctx.shadowOffsetY = 1.8 * k;
  ctx.fillStyle = shade(metal, -0.2);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();
  ctx.restore();

  const open = g.opening * k;
  if (g.dive) {
    drawCoinEdge(ctx, cx, cy, R + 0.1 * k, R - 0.9 * k, metal, k);
    polishedRing(ctx, cx, cy, R - 0.8 * k, R - 1.3 * k, metal, 0.8);
    const insert = document.createElement('canvas');
    const outer = R - 1.3 * k;
    drawBezelInsert(insert, variant, open / outer, Math.max(256, Math.ceil(outer * 2)));
    ctx.drawImage(insert, cx - outer, cy - outer, outer * 2, outer * 2);
    // a glossy insert reflects a little of the room
    const gl = ctx.createConicGradient(-Math.PI / 2, cx, cy);
    gl.addColorStop(0, 'rgba(255,255,255,0)');
    gl.addColorStop(0.8, 'rgba(255,255,255,0)');
    gl.addColorStop(0.87, 'rgba(255,255,255,0.14)');
    gl.addColorStop(0.94, 'rgba(255,255,255,0)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, TAU);
    ctx.arc(cx, cy, open, 0, TAU, true);
    ctx.fill('evenodd');
  } else {
    polishedRing(ctx, cx, cy, R, open, metal, watch.case.finish === 'brushed' ? 0.55 : 1);
    // the bezel slopes down to the glass: a little darker toward its inner edge
    const slope = ctx.createRadialGradient(cx, cy, open, cx, cy, R);
    slope.addColorStop(0, 'rgba(0,0,0,0.28)');
    slope.addColorStop(0.35, 'rgba(0,0,0,0)');
    slope.addColorStop(0.85, 'rgba(255,255,255,0.06)');
    slope.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = slope;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.arc(cx, cy, open, 0, TAU, true);
    ctx.fill('evenodd');
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = Math.max(0.6, 0.14 * k);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.stroke();
  edgeGlint(ctx, cx, cy, R - 0.35 * k, k, 0.6);
  if (!g.dive) edgeGlint(ctx, cx, cy, open + 0.35 * k, k, 0.35);

  // dial, seen through the opening
  const dial = document.createElement('canvas');
  const Rd = g.Rdial * k;
  drawDial(dial, watch, variant, { size: Math.min(1400, Math.max(256, Math.ceil(Rd * 2.4))), date });
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, open, 0, TAU);
  ctx.clip();
  ctx.drawImage(dial, cx - Rd, cy - Rd, Rd * 2, Rd * 2);
  // the bezel wall shades the dial on the side the light comes from
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 1.6 * k;
  ctx.shadowOffsetX = -LIGHT[0] * 0.9 * k;
  ctx.shadowOffsetY = -LIGHT[1] * 0.9 * k;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4 * k;
  ctx.beginPath();
  ctx.arc(cx, cy, open + 2 * k, 0, TAU);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = Math.max(0.8, 0.25 * k);
  ctx.beginPath();
  ctx.arc(cx, cy, open, 0, TAU);
  ctx.stroke();

  return canvas;
}

/** Pixels per millimetre for a square of side S. `zoom` > 1 crops more of the strap. */
export function scaleFor(watch, S, zoom = 1) {
  return (S * 0.5 * zoom) / Math.max(REF_DIAMETER, watch.case.diameter);
}

// ── hands ─────────────────────────────────────────────────────
/** Outlines in mm, pointing along +y (up), pivot at the origin. Same shapes as the 3D hands. */
const OUTLINES = {
  dauphine: (L, W) => [[0, -L * 0.12], [W * 0.5, L * 0.18], [0, L], [-W * 0.5, L * 0.18]],
  sword: (L, W) => [[-W * 0.32, -L * 0.14], [W * 0.32, -L * 0.14], [W * 0.22, L * 0.72], [0, L], [-W * 0.22, L * 0.72]],
  leaf: (L, W) => [[0, -L * 0.1], [W * 0.5, L * 0.3], [W * 0.3, L * 0.72], [0, L], [-W * 0.3, L * 0.72], [-W * 0.5, L * 0.3]],
  arrow: (L, W) => [[-W * 0.3, -L * 0.12], [W * 0.3, -L * 0.12], [W * 0.3, L * 0.5], [W * 0.62, L * 0.5], [0, L], [-W * 0.62, L * 0.5], [-W * 0.3, L * 0.5]],
};

/** Brightness of a facet whose normal (hand space, +x = right of the hand) is n, after rotating by a. */
function facetLight(nx, a) {
  const wx = nx * Math.cos(a);
  const wy = nx * Math.sin(a);
  return wx * LIGHT[0] + wy * LIGHT[1];
}

function drawHand(ctx, cx, cy, k, a, pts, color, { lift, lume }) {
  const path = (scale = 1) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k * scale, -y * k) : ctx.moveTo(x * k * scale, -y * k)));
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(a);
  // shadow on the dial: hands sit higher the later they are stacked
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = (0.6 + lift) * k;
  const offX = -LIGHT[0] * lift * k;
  const offY = -LIGHT[1] * lift * k;
  // shadow offsets are in screen space and ignore the transform, which is what we want
  ctx.shadowOffsetX = offX;
  ctx.shadowOffsetY = offY;
  path();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  // two facets either side of the ridge, lit as they turn
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(side < 0 ? -50 * k : 0, -50 * k, 50 * k, 100 * k);
    ctx.clip();
    path();
    const l = facetLight(side, a);
    ctx.fillStyle = shade(color, l > 0 ? l * 0.55 : l * 0.45);
    ctx.fill();
    ctx.restore();
  }
  if (lume) {
    // inset luminous fill on sport hands
    const ys = pts.map(([, y]) => y);
    const top = Math.max(...ys);
    ctx.save();
    path(0.62);
    ctx.clip();
    ctx.fillStyle = lume;
    ctx.fillRect(-20 * k, -top * k * 0.94, 40 * k, top * k * 0.72);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(0.5, 0.06 * k);
  path();
  ctx.stroke();
  ctx.restore();
}

/**
 * Hands and glass, drawn over a base layer. `time` is [hours, minutes, seconds] (seconds may be
 * fractional for a stepping seconds hand).
 */
export function paintHands(ctx, watch, variant, { cx, cy, k, time }) {
  const g = watchGeometry(watch);
  const radius = g.Rdial * 0.95; // same reference length as the 3D hands
  const style = OUTLINES[watch.dial.hands] ? watch.dial.hands : 'dauphine';
  const color = variant.hands ?? '#d6dae0';
  const second = variant.second ?? color;
  const lume = variant.lume && (style === 'arrow' || style === 'sword') ? variant.lume : null;
  const [hh, mm, ss] = time;
  const min = mm + ss / 60;
  const hrs = (hh % 12) + min / 60;

  drawHand(ctx, cx, cy, k, (hrs / 12) * TAU, OUTLINES[style](radius * 0.52, 2.8), color, { lift: 0.5, lume });
  drawHand(ctx, cx, cy, k, (min / 60) * TAU, OUTLINES[style](radius * 0.8, 2.1), color, { lift: 0.8, lume });

  const sa = (ss / 60) * TAU;
  if (hasSmallSeconds(watch)) {
    const dialR = radius / 0.95;
    const subR = dialR * SMALL_SECONDS.r;
    drawHand(ctx, cx, cy + dialR * SMALL_SECONDS.y * k, k, sa, OUTLINES.leaf(subR * 0.86, subR * 0.2), second, { lift: 0.4 });
    ctx.fillStyle = second;
    ctx.beginPath();
    ctx.arc(cx, cy + dialR * SMALL_SECONDS.y * k, subR * 0.08 * k, 0, TAU);
    ctx.fill();
  } else {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sa);
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 1.4 * k;
    ctx.shadowOffsetX = -LIGHT[0] * 1.1 * k;
    ctx.shadowOffsetY = -LIGHT[1] * 1.1 * k;
    ctx.fillStyle = second;
    ctx.fillRect(-0.17 * k, -radius * 0.9 * k, 0.34 * k, radius * 1.06 * k);
    ctx.beginPath();
    ctx.arc(0, radius * 0.16 * k, 0.75 * k, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // centre cap
  const capR = 1.1 * k;
  const cap = ctx.createRadialGradient(cx - capR * 0.4, cy - capR * 0.4, 0, cx, cy, capR);
  cap.addColorStop(0, shade(color, 0.7));
  cap.addColorStop(1, shade(color, -0.35));
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.arc(cx, cy, capR, 0, TAU);
  ctx.fill();
}

/** Reflections on the crystal: a soft wash and a sharp window highlight; stronger when domed. */
export function paintGlass(ctx, watch, { cx, cy, k }) {
  const g = watchGeometry(watch);
  const r = g.opening * k;
  const domed = watch.crystal?.type === 'domed';
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.clip();
  const wash = ctx.createRadialGradient(cx - r * 0.45, cy - r * 0.55, 0, cx - r * 0.3, cy - r * 0.35, r * 1.1);
  wash.addColorStop(0, `rgba(255,255,255,${domed ? 0.13 : 0.08})`);
  wash.addColorStop(0.55, 'rgba(255,255,255,0.02)');
  wash.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.lineCap = 'round';
  ctx.filter = `blur(${Math.max(0.5, 0.35 * k)}px)`;
  ctx.strokeStyle = `rgba(255,255,255,${domed ? 0.3 : 0.18})`;
  ctx.lineWidth = (domed ? 1.4 : 0.9) * k;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.88, Math.PI * 1.08, Math.PI * 1.42);
  ctx.stroke();
  if (domed) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2.2 * k;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, Math.PI * 0.08, Math.PI * 0.32);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Convenience: draw a whole watch into `canvas` (sized S×S) at a fixed time. Used for cards and
 * thumbnails; the live views keep the base layer and repaint only the hands.
 */
export function drawWatch(canvas, watch, variant, { size = 560, time = [10, 9, 36], zoom = 1 } = {}) {
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(renderWatchBase(watch, variant, size, { zoom }), 0, 0);
  const at = { cx: size / 2, cy: size / 2, k: scaleFor(watch, size, zoom), time };
  paintHands(ctx, watch, variant, at);
  paintGlass(ctx, watch, at);
  return canvas;
}
