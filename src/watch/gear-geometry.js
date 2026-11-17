import * as THREE from 'three';
import { gearOutline } from './gear-outline.js';

/**
 * Extruded gear for three.js, centred on the origin with its axis along Z. The 2D shape comes from
 * `gear-outline.js` (tooth 0 points along +X, so a mesh partner can be phased exactly).
 *
 * @param {object} o
 * @param {number} o.teeth
 * @param {number} o.module     tooth size; pitch radius = module * teeth / 2
 * @param {number} o.thickness
 * @param {number} [o.spokes]   crescent windows between hub and rim (0 = solid)
 * @param {'fine'|'escape'} [o.profile]
 * @param {number} [o.bore]
 */
export function makeGearGeometry({ teeth, module: m, thickness, spokes = 0, bore = 0.16, profile = 'fine' }) {
  const { outline, holes, pitchR } = gearOutline({ teeth, module: m, spokes, bore, profile });

  const shape = new THREE.Shape();
  outline.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  for (const ring of holes) {
    const hole = new THREE.Path();
    ring.forEach(([x, y], i) => (i ? hole.lineTo(x, y) : hole.moveTo(x, y)));
    hole.closePath();
    shape.holes.push(hole);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    // a very small chamfer: it catches the light on every edge, which is what makes thin steel read as steel
    bevelEnabled: true,
    bevelThickness: thickness * 0.2,
    bevelSize: m * 0.05,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -thickness / 2);
  return { geometry, pitchR };
}

export { meshAngle } from './mesh-angle.js';
