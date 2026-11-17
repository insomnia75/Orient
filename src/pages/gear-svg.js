import { svg } from '../core/dom.js';
import { meshAngle } from '../watch/mesh-angle.js';
import { gearOutline, outlineToPath } from '../watch/gear-outline.js';

/**
 * Wheels drawn like a movement plate: slender teeth, crescent spokes, a bore. The shapes come from
 * the same `gear-outline.js` the 3D hero uses, so the whole site shares one gear. Tooth 0 is centred
 * on angle 0, which is what `meshAngle` assumes.
 */

const MODULE = 6; // pitch diameter = module × teeth

/** Three meshing gears. Returns { el, setProgress(0..1) } where progress drives the main wheel. */
export function createGearTrain({ turns = 3 } = {}) {
  const spec = [
    { id: 'a', T: 36, x: 170, y: 210 },
    { id: 'b', T: 20, parent: 'a', phi: -0.5 },
    { id: 'c', T: 28, parent: 'a', phi: 0.9 },
  ];
  const nodes = {};
  const root = svg('svg', { viewBox: '0 0 460 480', class: 'gear-train', role: 'img', 'aria-label': 'Three meshing gears' });

  for (const g of spec) {
    const pitchR = (MODULE * g.T) / 2;
    if (g.parent) {
      const p = nodes[g.parent];
      g.x = p.x + Math.cos(g.phi) * (p.pitchR + pitchR);
      g.y = p.y + Math.sin(g.phi) * (p.pitchR + pitchR);
    }
    const spokes = g.T >= 30 ? 5 : g.T >= 24 ? 4 : 3;
    const outline = gearOutline({ teeth: g.T, module: MODULE, spokes });
    const group = svg('g');
    group.append(svg('path', { d: outlineToPath(outline, 1), class: 'gear-train__body', 'fill-rule': 'evenodd' }));
    // a ruby on the axle of the main wheel: the only red on the page, like the 時 seal
    if (g.id === 'a') group.append(svg('circle', { r: 7, class: 'gear-train__jewel' }));
    root.append(group);
    nodes[g.id] = { ...g, pitchR, group };
  }

  function setProgress(p) {
    const a = nodes.a;
    const rotA = p * Math.PI * 2 * turns;
    const set = (n, rot) => n.group.setAttribute('transform', `translate(${n.x.toFixed(2)} ${n.y.toFixed(2)}) rotate(${((rot * 180) / Math.PI).toFixed(2)})`);
    set(a, rotA);
    for (const id of ['b', 'c']) {
      const n = nodes[id];
      set(n, meshAngle(rotA, a.T, n.T, n.phi));
    }
  }
  setProgress(0);
  return { el: root, setProgress };
}
