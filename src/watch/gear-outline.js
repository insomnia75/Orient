/**
 * Pure 2D gear outlines. No three.js, no DOM: the 3D hero, the movement in the showcase, the SVG
 * wheels on the heritage page and the offline layout preview all share this one source of shapes.
 *
 * Conventions
 *  - the axis is the origin; tooth 0 is centred on angle 0 (this is what `meshAngle` assumes)
 *  - all gears that mesh must share the same `module`
 *  - angles are radians, CCW from +X
 */

const TAU = Math.PI * 2;

/** Tooth flank as [fraction of one pitch from the tooth centre, radius selector]. */
const FINE = [
  [-0.5, 'root'],
  [-0.31, 'root'],
  [-0.2, 'pitch'],
  [-0.085, 'tip'],
  [0.085, 'tip'],
  [0.2, 'pitch'],
  [0.31, 'root'],
];

/** Escape-wheel teeth: a near-radial lifting face, a short flat, then a long curved ramp. */
const ESCAPE = [
  [-0.04, 'root'],
  [0.0, 'tip'],
  [0.1, 'tip'],
  [0.3, 'ramp'],
  [0.5, 'root'],
];

function chaikin(points, rounds) {
  let pts = points;
  for (let r = 0; r < rounds; r++) {
    const next = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      next.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      next.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    pts = next;
  }
  return pts;
}

/**
 * Crescent-shaped spoke windows, like the arms of a real train wheel: constant-width arms that
 * sweep a little as they leave the hub. Corners are rounded with two Chaikin passes.
 */
function spokeWindows({ spokes, rootR, sweep, armHalf }) {
  const rimIn = rootR * 0.84;
  const hubR = rootR * 0.3;
  const step = TAU / spokes;
  const arm = (r, k) => k * step + sweep * (1 - r / rimIn);
  const half = (r) => Math.asin(Math.min(0.9, armHalf / r));
  const left = (r, k) => arm(r, k) + half(r);
  const right = (r, k) => arm(r, k + 1) - half(r);
  const P = (r, a) => [r * Math.cos(a), r * Math.sin(a)];

  const out = [];
  for (let k = 0; k < spokes; k++) {
    const poly = [];
    const nArc = 7;
    for (let s = 0; s <= nArc; s++) {
      const t = s / nArc;
      poly.push(P(rimIn, left(rimIn, k) + (right(rimIn, k) - left(rimIn, k)) * t));
    }
    const nSide = 6;
    for (let s = 1; s <= nSide; s++) {
      const r = rimIn + (hubR - rimIn) * (s / nSide);
      poly.push(P(r, right(r, k)));
    }
    const nIn = 4;
    for (let s = 1; s < nIn; s++) {
      const t = s / nIn;
      poly.push(P(hubR, right(hubR, k) + (left(hubR, k) - right(hubR, k)) * t));
    }
    for (let s = 0; s < nSide; s++) {
      const r = hubR + (rimIn - hubR) * (s / nSide);
      poly.push(P(r, left(r, k)));
    }
    out.push(chaikin(poly, 2));
  }
  return out;
}

/**
 * @param {object} o
 * @param {number} o.teeth
 * @param {number} o.module           pitch radius = module * teeth / 2
 * @param {number} [o.spokes=0]       crescent windows between hub and rim (0 = solid disc)
 * @param {'fine'|'escape'} [o.profile='fine']
 * @param {number} [o.bore=0.16]      bore as a fraction of the root radius
 * @param {number} [o.sweep=0.32]     how far the arms curl (radians)
 * @returns {{outline:number[][], holes:number[][][], pitchR:number, outerR:number, rootR:number}}
 */
export function gearOutline({ teeth, module: m, spokes = 0, profile = 'fine', bore = 0.16, sweep = 0.32 }) {
  const pitchR = (m * teeth) / 2;
  const outerR = pitchR + 0.85 * m;
  const rootR = pitchR - 1.05 * m;
  const rampR = rootR + (outerR - rootR) * 0.38;
  const radius = { root: rootR, pitch: pitchR, tip: outerR, ramp: rampR };
  const prof = profile === 'escape' ? ESCAPE : FINE;
  const P = TAU / teeth;

  const outline = [];
  for (let i = 0; i < teeth; i++) {
    for (const [f, which] of prof) {
      const a = (i + f) * P;
      const r = radius[which];
      outline.push([r * Math.cos(a), r * Math.sin(a)]);
    }
  }

  const holes = [];
  const boreR = Math.max(rootR * bore, m * 0.55);
  const circle = [];
  for (let s = 0; s < 22; s++) {
    const a = (s / 22) * TAU;
    circle.push([boreR * Math.cos(a), boreR * Math.sin(a)]);
  }
  holes.push(circle);
  if (spokes > 0) holes.push(...spokeWindows({ spokes, rootR, sweep, armHalf: rootR * 0.06 }));

  return { outline, holes, pitchR, outerR, rootR };
}

/** SVG path data for a polygon list (outline plus holes); use with fill-rule evenodd. */
export function outlineToPath({ outline, holes }, digits = 2) {
  const ring = (pts) => `${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(digits)} ${y.toFixed(digits)}`).join('')}Z`;
  return [ring(outline), ...holes.map(ring)].join('');
}
