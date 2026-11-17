/**
 * Layout of the hero movement. Pure data and maths (no three.js), so the same file drives the
 * live scene and the offline layout preview in tests.
 *
 * Reading the train: a wheel `parent`-meshes with the wheel before it, so the parent's tooth count
 * and the child's decide its speed; a `coaxial` part sits on the same axle and turns with it,
 * like a pinion cut onto a wheel's arbor. Units are scene units, +Y up.
 */
import { meshAngle } from '../watch/mesh-angle.js';

export const MODULE = 0.1;

/** Speed of the barrel in rad/s. Every other wheel follows from the tooth counts. */
export const BARREL_SPEED = 0.018;

export const TRAIN = [
  // mainspring barrel: the big slow drum
  { id: 'barrel', T: 60, pos: [5.5, -1.0], z: 0, th: 0.08, tone: 'dark', spokes: 0, bore: 0.03 },
  // centre wheel, with its pinion meshing into the barrel
  { id: 'p1', T: 12, parent: 'barrel', phi: 2.5, z: 0.06, th: 0.16, tone: 'steel', spokes: 0 },
  { id: 'w1', T: 48, coaxial: 'p1', z: 0.2, th: 0.07, tone: 'steel', spokes: 5 },
  // third wheel
  { id: 'p2', T: 14, parent: 'w1', phi: 0.6, z: 0.2, th: 0.14, tone: 'steel', spokes: 0 },
  { id: 'w2', T: 30, coaxial: 'p2', z: 0.35, th: 0.07, tone: 'brass', spokes: 4 },
  // escape wheel, fastest part of the train
  { id: 'p3', T: 10, parent: 'w2', phi: -0.3, z: 0.35, th: 0.12, tone: 'steel', spokes: 0 },
  { id: 'esc', T: 15, coaxial: 'p3', z: 0.48, th: 0.06, tone: 'steel', spokes: 0, profile: 'escape' },
];

/** Balance wheel with hairspring. Not part of the geared train: it swings. */
export const BALANCE = { pos: [1.15, -2.95], z: 0.55, radius: 1.3 };

/** Main plate the movement sits on. */
export const PLATE = { pos: [4.3, -0.55], z: -0.22, radius: 6.5 };

/** Resolve positions and pitch radii for every part. Returns an object keyed by id. */
export function layoutTrain(spec = TRAIN, module = MODULE) {
  const nodes = {};
  for (const g of spec) {
    const pitchR = (module * g.T) / 2;
    let x;
    let y;
    if (g.coaxial) {
      ({ x, y } = nodes[g.coaxial]);
    } else if (g.parent) {
      const p = nodes[g.parent];
      x = p.x + Math.cos(g.phi) * (p.pitchR + pitchR);
      y = p.y + Math.sin(g.phi) * (p.pitchR + pitchR);
    } else {
      [x, y] = g.pos;
    }
    nodes[g.id] = { ...g, x, y, pitchR, rot: 0 };
  }
  return nodes;
}

/** Set every node's `rot` for time `t` (seconds). Teeth mesh at every angle. */
export function poseTrain(nodes, t, speed = BARREL_SPEED) {
  for (const g of TRAIN) {
    const n = nodes[g.id];
    if (!g.parent && !g.coaxial) n.rot = t * speed;
    else if (g.coaxial) n.rot = nodes[g.coaxial].rot;
    else {
      const p = nodes[g.parent];
      n.rot = meshAngle(p.rot, p.T, n.T, g.phi);
    }
  }
  return nodes;
}

/**
 * Balance swing. The real balance beats at 3 Hz (six beats a second); that would only read as a
 * blur on screen, so the hero shows it in slow motion.
 */
export const BALANCE_HZ = 0.8;
export const BALANCE_AMPLITUDE = 2.1; // radians each side
export function balancePose(t) {
  const s = Math.sin(t * BALANCE_HZ * Math.PI * 2);
  return { angle: BALANCE_AMPLITUDE * s, breathe: 1 - 0.07 * s * s };
}
