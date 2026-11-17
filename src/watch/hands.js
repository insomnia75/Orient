import * as THREE from 'three';
import { beats } from '../core/motion.js';
import { SMALL_SECONDS, hasSmallSeconds } from './dial-layout.js';

const poly = (pts) => {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
};

/** Hand outlines pointing along +Y. L = length, W = width (mm). */
const OUTLINES = {
  dauphine: (L, W) => poly([[0, -L * 0.12], [W * 0.5, L * 0.18], [0, L], [-W * 0.5, L * 0.18]]),
  sword: (L, W) => poly([[-W * 0.32, -L * 0.14], [W * 0.32, -L * 0.14], [W * 0.22, L * 0.72], [0, L], [-W * 0.22, L * 0.72]]),
  // a slender leaf: widest about a third of the way out, tapering to a fine tip
  leaf: (L, W) => poly([[0, -L * 0.1], [W * 0.5, L * 0.3], [W * 0.3, L * 0.72], [0, L], [-W * 0.3, L * 0.72], [-W * 0.5, L * 0.3]]),
  arrow: (L, W) =>
    poly([[-W * 0.3, -L * 0.12], [W * 0.3, -L * 0.12], [W * 0.3, L * 0.5], [W * 0.62, L * 0.5], [0, L], [-W * 0.62, L * 0.5], [-W * 0.3, L * 0.5]]),
};

const EXTRUDE = { depth: 0.3, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1 };

/**
 * Hour, minute and (stepping) second hands, pivoting at the group's origin.
 * @param {number} radius  visible dial radius in mm
 */
export function buildHands(watch, variant, radius) {
  const style = OUTLINES[watch.dial.hands] ? watch.dial.hands : 'dauphine';
  const group = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({ color: variant.hands ?? '#d6dae0', metalness: 1, roughness: 0.22 });
  const secMat = new THREE.MeshStandardMaterial({ color: variant.second ?? variant.hands ?? '#d6dae0', metalness: 1, roughness: 0.25 });

  const make = (L, W, z) => {
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(OUTLINES[style](L, W), EXTRUDE), mat);
    const holder = new THREE.Group();
    holder.position.z = z;
    holder.add(mesh);
    group.add(holder);
    return holder;
  };

  const hour = make(radius * 0.52, 2.8, 0);
  const minute = make(radius * 0.8, 2.1, 0.55);

  // Seconds: a sweeping rod from the centre, or, on a small-seconds dial, a short leaf on its own sub-dial.
  const second = new THREE.Group();
  second.position.z = 1.15;
  const small = hasSmallSeconds(watch);
  if (small) {
    const dialR = radius / 0.95; // `radius` is the visible dial radius times 0.95
    const subR = dialR * SMALL_SECONDS.r;
    second.position.set(0, -dialR * SMALL_SECONDS.y, 0.5);
    const leaf = new THREE.Mesh(new THREE.ExtrudeGeometry(OUTLINES.leaf(subR * 0.86, subR * 0.2), EXTRUDE), secMat);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(subR * 0.07, subR * 0.07, 0.3, 16).rotateX(Math.PI / 2), secMat);
    second.add(leaf, hub);
  } else {
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.34, radius * 0.9, 0.2), secMat);
    rod.position.y = radius * 0.9 * 0.5 - radius * 0.14;
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.22, 20).rotateX(Math.PI / 2), secMat);
    tail.position.y = -radius * 0.16;
    second.add(rod, tail);
  }
  group.add(second);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.8, 24).rotateX(Math.PI / 2), mat);
  cap.position.z = 0.9;
  group.add(cap);

  /** Set hand angles from a Date. Seconds advance in 6 snapping beats, like the calibre. */
  function update(now = new Date()) {
    const sec = now.getSeconds() + now.getMilliseconds() / 1000;
    const stepped = beats(sec) / 6; // seconds, snapped to beats
    const min = now.getMinutes() + sec / 60;
    const hrs = (now.getHours() % 12) + min / 60;
    second.rotation.z = -(stepped / 60) * Math.PI * 2;
    minute.rotation.z = -(min / 60) * Math.PI * 2;
    hour.rotation.z = -(hrs / 12) * Math.PI * 2;
  }

  return { group, update, materials: [mat, secMat] };
}
