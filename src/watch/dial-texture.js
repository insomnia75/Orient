/**
 * Draws watch dials and bezel inserts onto a 2D canvas from data (see data/watches.js).
 * Used three ways: as the 3D dial texture, as rail thumbnails, and as the 2D fallback view.
 * The canvas is the dial's bounding square; 12 o'clock is at the top.
 */

import { SMALL_SECONDS, POWER_RESERVE } from './dial-layout.js';

const TAU = Math.PI * 2;
const SERIF = '"Shippori Mincho", "Hiragino Mincho ProN", Georgia, serif';

const polar = (cx, cy, r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];

/** Canvas text with manual tracking (ctx.letterSpacing is not available everywhere). */
function trackedText(ctx, text, x, y, tracking) {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let px = x - total / 2;
  ctx.textAlign = 'left';
  chars.forEach((ch, i) => {
    ctx.fillText(ch, px, y);
    px += widths[i] + tracking;
  });
}

function sunray(ctx, cx, cy, R, strength) {
  const g = ctx.createConicGradient(0, cx, cy);
  const N = 96;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a =
      Math.sin(t * TAU * 3) * 0.5 + Math.sin(t * TAU * 7 + 1.3) * 0.3 + Math.sin(t * TAU * 13 + 0.4) * 0.2;
    const v = a * strength;
    g.addColorStop(t, v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cx * 2, cy * 2);
}

/** Fine, even speckle: a sandblasted dial. Seeded, so it never shimmers between redraws. */
function grain(ctx, cx, cy, R, density = 9000) {
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < density; i++) {
    const a = rnd() * TAU;
    const r = Math.sqrt(rnd()) * R;
    const light = rnd() > 0.5;
    ctx.fillStyle = light ? `rgba(255,255,255,${0.03 + rnd() * 0.07})` : `rgba(0,0,0,${0.04 + rnd() * 0.08})`;
    const size = R * (0.0016 + rnd() * 0.0022);
    ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, size, size);
  }
}

function vignette(ctx, cx, cy, R, amount) {
  const g = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
  g.addColorStop(0, 'rgba(255,255,255,0.07)');
  g.addColorStop(0.6, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${amount})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cx * 2, cy * 2);
}

function drawTrack(ctx, cx, cy, R, style, color) {
  if (style === 'none') return;
  ctx.strokeStyle = color;
  ctx.lineCap = 'butt';
  if (style === 'railroad') {
    ctx.lineWidth = R * 0.006;
    for (const r of [0.915, 0.955]) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * r, 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU;
      const [x1, y1] = polar(cx, cy, R * (i % 5 ? 0.915 : 0.89), a);
      const [x2, y2] = polar(cx, cy, R * 0.955, a);
      ctx.lineWidth = R * (i % 5 ? 0.004 : 0.01);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU;
      const [x1, y1] = polar(cx, cy, R * (i % 5 ? 0.935 : 0.9), a);
      const [x2, y2] = polar(cx, cy, R * 0.965, a);
      ctx.lineWidth = R * (i % 5 ? 0.005 : 0.012);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
}

function drawMarkers(ctx, cx, cy, R, style, { marker, lume, edge }, skip) {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  for (let n = 1; n <= 12; n++) {
    if (skip.has(n)) continue;
    const a = (n / 12) * TAU;

    if (style === 'arabic' || style === 'roman') {
      const [x, y] = polar(cx, cy, R * 0.74, a);
      ctx.fillStyle = marker;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `500 ${R * (style === 'roman' ? 0.105 : 0.15)}px ${SERIF}`;
      ctx.fillText(style === 'roman' ? roman[n - 1] : String(n), x, y);
      continue;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillStyle = lume;
    ctx.strokeStyle = edge;
    ctx.lineWidth = R * 0.008;

    if (style === 'baton') {
      const w = R * 0.05;
      const rects = n === 12 ? [-w * 0.9, w * 0.9] : [0];
      for (const ox of rects) {
        ctx.beginPath();
        ctx.rect(ox - w / 2, -R * 0.86, w, R * 0.22);
        ctx.fill();
        ctx.stroke();
      }
    } else if (style === 'kamasu') {
      const big = n === 12 || n === 6 || n === 9;
      const w = R * (big ? 0.075 : 0.055);
      ctx.beginPath();
      ctx.moveTo(-w, -R * 0.88);
      ctx.lineTo(w, -R * 0.88);
      ctx.lineTo(0, -R * (big ? 0.62 : 0.68));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Recessed sub-dial at 6 with a twelve-dash track; the hand itself is a separate part. */
function drawSmallSeconds(ctx, cx, cy, R, color) {
  const sx = cx;
  const sy = cy + R * SMALL_SECONDS.y;
  const r = R * SMALL_SECONDS.r;
  const g = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r);
  g.addColorStop(0, 'rgba(255,255,255,0.10)');
  g.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = R * 0.005;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = R * 0.008;
  ctx.lineCap = 'butt';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.beginPath();
    ctx.moveTo(sx + Math.sin(a) * r * 0.76, sy - Math.cos(a) * r * 0.76);
    ctx.lineTo(sx + Math.sin(a) * r * 0.94, sy - Math.cos(a) * r * 0.94);
    ctx.stroke();
  }
}

/** Power reserve indicator at 12: a fan of ticks and a needle. The needle is painted, so it shows a fixed level. */
function drawPowerReserve(ctx, cx, cy, R, color, dialColor) {
  const px = cx;
  const py = cy + R * POWER_RESERVE.y;
  const r = R * POWER_RESERVE.r;
  const half = (52 * Math.PI) / 180;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.arc(px, py, r * 1.02, -Math.PI / 2 - half - 0.08, -Math.PI / 2 + half + 0.08);
  ctx.closePath();
  const g = ctx.createRadialGradient(px, py, 0, px, py, r);
  g.addColorStop(0, 'rgba(0,0,0,0.0)');
  g.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = dialColor;
  ctx.fill();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'butt';
  ctx.lineWidth = R * 0.0055;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(px, py, r, -Math.PI / 2 - half, -Math.PI / 2 + half);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = R * 0.007;
  for (let i = 0; i <= 8; i++) {
    const a = -half + (i / 8) * half * 2;
    const long = i === 0 || i === 8 || i === 4;
    ctx.beginPath();
    ctx.moveTo(px + Math.sin(a) * r * (long ? 0.78 : 0.86), py - Math.cos(a) * r * (long ? 0.78 : 0.86));
    ctx.lineTo(px + Math.sin(a) * r * 0.97, py - Math.cos(a) * r * 0.97);
    ctx.stroke();
  }
  // needle, at roughly three quarters of the reserve
  const na = -half + 0.72 * half * 2;
  ctx.lineWidth = R * 0.008;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + Math.sin(na) * r * 0.84, py - Math.cos(na) * r * 0.84);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, R * 0.012, 0, TAU);
  ctx.fill();
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWindow(ctx, x, y, w, h, text, R, edge) {
  ctx.fillStyle = '#f4f2ea';
  roundedRect(ctx, x, y, w, h, R * 0.01);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = R * 0.008;
  ctx.stroke();
  ctx.fillStyle = '#1a1c20';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${h * 0.62}px ${SERIF}`;
  ctx.fillText(text, x + w / 2, y + h / 2 + h * 0.04);
}

function drawSunMoon(ctx, cx, cy, R, edge, hour) {
  const ox = cx;
  const oy = cy - R * 0.2;
  const r = R * 0.3;
  const isDay = hour >= 6 && hour < 18;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ox, oy, r, Math.PI, TAU);
  ctx.closePath();
  ctx.clip();

  const sky = ctx.createLinearGradient(0, oy - r, 0, oy);
  if (isDay) {
    sky.addColorStop(0, '#8ec2ee');
    sky.addColorStop(1, '#f6e3a8');
  } else {
    sky.addColorStop(0, '#070d1f');
    sky.addColorStop(1, '#1b2a55');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(ox - r, oy - r, r * 2, r);

  if (isDay) {
    ctx.fillStyle = '#f4b73a';
    ctx.beginPath();
    ctx.arc(ox, oy - r * 0.18, r * 0.3, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#f4b73a';
    ctx.lineWidth = r * 0.04;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.beginPath();
      ctx.moveTo(ox + Math.cos(a) * r * 0.38, oy - r * 0.18 + Math.sin(a) * r * 0.38);
      ctx.lineTo(ox + Math.cos(a) * r * 0.5, oy - r * 0.18 + Math.sin(a) * r * 0.5);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#e9edf6';
    ctx.beginPath();
    ctx.arc(ox, oy - r * 0.2, r * 0.26, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b2a55';
    ctx.beginPath();
    ctx.arc(ox + r * 0.12, oy - r * 0.26, r * 0.23, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e9edf6';
    for (const [sx, sy] of [[-0.55, -0.45], [0.5, -0.6], [-0.3, -0.8], [0.7, -0.25], [-0.75, -0.15]]) {
      ctx.beginPath();
      ctx.arc(ox + sx * r, oy + sy * r, r * 0.025, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.strokeStyle = edge;
  ctx.lineWidth = R * 0.012;
  ctx.beginPath();
  ctx.arc(ox, oy, r, Math.PI, TAU);
  ctx.closePath();
  ctx.stroke();
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * @param {HTMLCanvasElement} canvas  target (resized to size × size)
 * @param {object} watch              entry from data/watches.js
 * @param {object} variant            one of watch.variants
 */
export function drawDial(canvas, watch, variant, { size = 1024, date = new Date() } = {}) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const R = size / 2;
  const cx = R;
  const cy = R;
  const d = watch.dial;
  const v = variant;
  const colors = {
    marker: v.marker ?? '#e8e6df',
    lume: v.lume ?? v.marker ?? '#e8e6df',
    edge: v.edge ?? '#cfd4da',
  };
  const comps = d.complications ?? [];

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip();

  ctx.fillStyle = v.dial;
  ctx.fillRect(0, 0, size, size);

  const finish = v.finish ?? d.finish ?? 'matte';
  if (finish === 'sunray') sunray(ctx, cx, cy, R, 0.12);
  vignette(ctx, cx, cy, R, finish === 'sunray' ? 0.38 : 0.2);
  if (finish === 'sandblast') grain(ctx, cx, cy, R);

  drawTrack(ctx, cx, cy, R, d.track ?? 'ticks', colors.marker);

  const skip = new Set();
  if (comps.includes('date') || comps.includes('day-date')) skip.add(3);
  if (comps.includes('sunmoon') || comps.includes('power-reserve')) skip.add(12);
  if (comps.includes('small-seconds')) skip.add(6);
  drawMarkers(ctx, cx, cy, R, d.markers ?? 'baton', colors, skip);

  // Complications
  const dayNum = String(date.getDate());
  if (comps.includes('day-date')) {
    const h = R * 0.13;
    drawWindow(ctx, cx + R * 0.34, cy - h / 2, R * 0.28, h, DAYS[date.getDay()], R, colors.edge);
    drawWindow(ctx, cx + R * 0.63, cy - h / 2, R * 0.17, h, dayNum, R, colors.edge);
  } else if (comps.includes('date')) {
    const h = R * 0.13;
    drawWindow(ctx, cx + R * 0.58, cy - h / 2, R * 0.2, h, dayNum, R, colors.edge);
  }
  if (comps.includes('sunmoon')) drawSunMoon(ctx, cx, cy, R, colors.edge, date.getHours());
  if (comps.includes('power-reserve')) drawPowerReserve(ctx, cx, cy, R, colors.marker, v.dial);
  if (comps.includes('small-seconds')) drawSmallSeconds(ctx, cx, cy, R, colors.marker);

  // Text
  ctx.fillStyle = colors.marker;
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${R * 0.072}px ${SERIF}`;
  trackedText(ctx, d.brand ?? 'ORIENT', cx, cy + R * (d.brandY ?? -0.45), R * 0.014);
  ctx.font = `500 ${R * 0.04}px ${SERIF}`;
  (d.lower ?? []).forEach((line, i) => {
    trackedText(ctx, line, cx, cy + R * (0.42 + i * 0.07), R * 0.012);
  });

  ctx.restore();
  return canvas;
}

/** Rotating bezel insert for dive watches. The canvas covers the ring's outer circle. */
export function drawBezelInsert(canvas, variant, innerRatio, size = 1024) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const R = size / 2;
  const cx = R;
  const cy = R;
  const base = variant.insert ?? '#121418';
  const mark = variant.insertMark ?? '#ecebe4';

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.arc(cx, cy, R * innerRatio, 0, TAU, true);
  ctx.fill('evenodd');

  const rMid = R * (1 + innerRatio) * 0.5;
  const band = R * (1 - innerRatio);
  ctx.strokeStyle = mark;
  ctx.fillStyle = mark;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU;
    const big = i % 5 === 0;
    const [x1, y1] = polar(cx, cy, R * 0.985, a);
    const [x2, y2] = polar(cx, cy, R * (big ? 0.985 - band / R * 0.3 : 0.985 - band / R * 0.16), a);
    ctx.lineWidth = R * (big ? 0.008 : 0.005);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${band * 0.34}px ${SERIF}`;
  for (const n of [10, 20, 30, 40, 50]) {
    const a = (n / 60) * TAU;
    const [x, y] = polar(cx, cy, rMid - band * 0.08, a);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillText(String(n), 0, 0);
    ctx.restore();
  }

  // Pip at 12
  ctx.fillStyle = variant.lume ?? '#dff3cc';
  ctx.beginPath();
  ctx.arc(cx, cy - rMid, band * 0.16, 0, TAU);
  ctx.fill();
  return canvas;
}
