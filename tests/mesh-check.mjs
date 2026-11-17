// Checks the hero gear train: at several moments, no tooth of a driven wheel may sit inside its parent.
// Run with: npm run test:mesh   (plain Node, no dependencies)
import { gearOutline } from '../src/watch/gear-outline.js';
import { TRAIN, MODULE, layoutTrain, poseTrain } from '../src/hero/hero-layout.js';
const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };
const world = (n, o) => o.outline.map(([x, y]) => { const c = Math.cos(n.rot), s = Math.sin(n.rot); return [n.x + x * c - y * s, n.y + x * s + y * c]; });
const outl = {}; for (const g of TRAIN) outl[g.id] = gearOutline({ teeth: g.T, module: MODULE, spokes: g.spokes ?? 0, profile: g.profile });
let worst = 0;
for (const t of [0, 7, 33, 120, 999, 4321]) {
  const nodes = poseTrain(layoutTrain(), t);
  for (const g of TRAIN) if (g.parent) {
    const a = nodes[g.parent], b = nodes[g.id];
    const pa = world(a, outl[a.id]), pb = world(b, outl[b.id]);
    // sample points on child's outline ring between root and tip, count those inside parent
    let hits = 0, n = 0;
    for (let k = 0; k < b.T * 40; k++) { const ang = (k / (b.T * 40)) * Math.PI * 2 + b.rot; for (const r of [b.pitchR - 0.05, b.pitchR + 0.05]) { const p = [b.x + r * Math.cos(ang), b.y + r * Math.sin(ang)]; if (inside(p, pb)) { n++; if (inside(p, pa)) hits++; } } }
    worst = Math.max(worst, hits / n);
    console.log(`t=${t} ${g.parent}->${g.id} overlap ${(100 * hits / n).toFixed(2)}%`);
  }
}
console.log('worst overlap', (100 * worst).toFixed(2) + '%');
if (worst > 0.005) {
  console.error('FAIL: meshing wheels overlap');
  process.exit(1);
}
console.log('OK: every meshing pair interlocks');
