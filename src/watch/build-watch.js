import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { drawDial, drawBezelInsert } from './dial-texture.js';
import { buildHands } from './hands.js';
import { buildStrap } from './strap.js';
import { buildMovement } from './movement.js';
import { MM } from '../config.js';

export { MM };

const SEG = 96;

/** Open cylinder wall between two z values; radius rTop at z1, rBot at z0. */
function wall(rTop, rBot, z0, z1, mat) {
  const g = new THREE.CylinderGeometry(rTop, rBot, Math.abs(z1 - z0), SEG, 1, true).rotateX(Math.PI / 2);
  g.translate(0, 0, (z0 + z1) / 2);
  return new THREE.Mesh(g, mat);
}

/** Flat ring facing +Z (dir = 1) or -Z (dir = -1). */
function ring(rIn, rOut, z, mat, dir = 1) {
  const g = new THREE.RingGeometry(rIn, rOut, SEG);
  if (dir < 0) g.rotateY(Math.PI);
  g.translate(0, 0, z);
  return new THREE.Mesh(g, mat);
}

function disc(r, z, mat, dir = 1) {
  const g = new THREE.CircleGeometry(r, SEG);
  if (dir < 0) g.rotateY(Math.PI);
  g.translate(0, 0, z);
  return new THREE.Mesh(g, mat);
}

/**
 * Builds the watch entirely from data, in millimetres, dial facing +Z, 12 o'clock up (+Y).
 * Everything is procedural, so any entry in data/watches.js renders without model files.
 *
 * @returns an object with: root, hotspots, views, setExplode(0..1), setPartVisible(name, bool),
 *          update(date, seconds), bezelSpin (Group|null), dispose()
 */
export function buildWatch(watch, variant, { anisotropy = 4 } = {}) {
  const c = watch.case;
  const R = c.diameter / 2;
  const t = c.thickness;
  const dive = watch.bezel?.type === 'dive120';
  const domed = watch.crystal?.type === 'domed';

  const root = new THREE.Group();
  root.name = `watch:${watch.id}:${variant.id}`;
  const extraTextures = [];
  const extraMaterials = [];
  const track = (m) => (extraMaterials.push(m), m);

  // ── z layout (mm) ─────────────────────────────────────────────
  const Z = {
    backBottom: -t / 2,
    backTop: -t / 2 + 1.6,
    midTop: 0.18 * t,
  };
  Z.bezelTop = Z.midTop + 0.2 * t;
  Z.dial = Z.midTop - 1.3;
  Z.hands = Z.dial + 1.0;

  const Ri = R - 2.2;
  const opening = dive ? R - 6.0 : R - 2.7;
  const Rdial = Math.min(opening + 0.4, Ri - 0.05);

  // ── materials ─────────────────────────────────────────────────
  const metal = c.metal ?? '#c8ccd2';
  const steel = track(new THREE.MeshStandardMaterial({ color: metal, metalness: 1, roughness: c.finish === 'brushed' ? 0.36 : 0.16 }));
  const steelBack = track(steel.clone());
  steelBack.side = THREE.BackSide;
  const satin = track(new THREE.MeshStandardMaterial({ color: metal, metalness: 1, roughness: 0.4 }));
  const dark = track(new THREE.MeshStandardMaterial({ color: '#12151a', metalness: 0.3, roughness: 0.7 }));

  const parts = {};
  const mk = (name) => {
    const g = new THREE.Group();
    g.name = name;
    root.add(g);
    parts[name] = g;
    return g;
  };

  // ── case body + lugs ──────────────────────────────────────────
  const body = mk('case');
  body.add(
    wall(R, R, Z.backTop, Z.midTop, steel),
    wall(R - 0.9, R, Z.backTop - 0.5, Z.backTop, steel),
    wall(Ri, Ri, Z.backTop, Z.midTop, steelBack),
    ring(R * 0.58, R - 0.9, Z.backTop - 0.5, steel, -1),
    disc(Ri, Z.dial - 0.3, dark),
  );
  // Lugs: a curved side profile (they slope down toward the wrist), extruded across the lug's
  // thickness. Built per side rather than mirrored, so no mesh has a negative scale.
  const lugT = Math.max(3.4, c.diameter * 0.095);
  const lugXi = c.lugWidth / 2;
  const lugY0 = Math.sqrt(Math.max(0, R * R - (lugXi + lugT) ** 2)) - 1; // reshaped to the case wall below
  const lugY1 = c.lugToLug / 2;
  const lugGeometry = (sx, sy) => {
    const pts = [];
    const N = 14;
    const zTop0 = Z.midTop - 0.2;
    const zTop1 = -0.08 * t;
    const zBot0 = Z.backTop - 0.2;
    const zBot1 = -0.3 * t;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const ease = 1 - (1 - u) * (1 - u); // falls away faster toward the tip
      pts.push([lugY0 + (lugY1 - lugY0) * u, zTop0 + (zTop1 - zTop0) * ease]);
    }
    // rounded tip, then back along the underside
    pts.push([lugY1 + 0.5, (zTop1 + zBot1) / 2]);
    for (let i = N; i >= 0; i--) {
      const u = i / N;
      pts.push([lugY0 + (lugY1 - lugY0) * u, zBot0 + (zBot1 - zBot0) * u]);
    }
    const shape = new THREE.Shape();
    pts.forEach(([y, z], i) => (i ? shape.lineTo(sy * y, z) : shape.moveTo(sy * y, z)));
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: lugT, bevelEnabled: true, bevelThickness: 0.45, bevelSize: 0.45, bevelSegments: 2, curveSegments: 1 });
    // shape space (x, y, extrude z) -> watch space (z, x, y): a rotation, so faces keep their winding
    g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
    g.translate(sx > 0 ? lugXi : -lugXi - lugT, 0, 0);
    // The root end of the lug follows the curve of the case wall, so it is hidden inside the case
    // but never shows through the dial opening, whatever the lug width.
    const p = g.attributes.position;
    const wallR = R - 0.4;
    for (let i = 0; i < p.count; i++) {
      const y = Math.abs(p.getY(i));
      if (y > lugY0 + 0.3) continue;
      const x = p.getX(i);
      const wall = Math.sqrt(Math.max(0, wallR * wallR - x * x));
      p.setY(i, sy * Math.max(wall - (lugY0 + 0.3 - y), 0));
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  };
  for (const sy of [-1, 1]) {
    for (const sx of [-1, 1]) body.add(new THREE.Mesh(lugGeometry(sx, sy), steel));
  }

  // ── caseback ──────────────────────────────────────────────────
  const caseback = mk('caseback');
  caseback.add(
    wall(R - 0.9, R - 0.9, Z.backBottom, Z.backTop - 0.5, satin),
    ring(R * 0.58, R - 0.9, Z.backBottom, satin, -1),
  );
  if (c.exhibition) {
    const glass = track(new THREE.MeshPhysicalMaterial({ color: '#9fb2c4', transparent: true, opacity: 0.22, roughness: 0.03, metalness: 0, clearcoat: 1, depthWrite: false }));
    caseback.add(disc(R * 0.58, Z.backBottom - 0.02, glass, -1));
  } else {
    caseback.add(disc(R * 0.58, Z.backBottom, satin, -1));
  }

  // ── movement ──────────────────────────────────────────────────
  const movement = buildMovement(Ri - 1.3);
  extraTextures.push(...movement.textures);
  const movementRoot = mk('movement');
  const movementRest = new THREE.Vector3(0, 0, Z.backTop + 1.6);
  movementRoot.position.copy(movementRest);
  movement.group.rotation.y = Math.PI; // detail faces the caseback
  movementRoot.add(movement.group);

  // ── dial ──────────────────────────────────────────────────────
  const dialCanvas = document.createElement('canvas');
  drawDial(dialCanvas, watch, variant, { size: 1024 });
  const dialTex = new THREE.CanvasTexture(dialCanvas);
  dialTex.colorSpace = THREE.SRGBColorSpace;
  dialTex.anisotropy = anisotropy;
  extraTextures.push(dialTex);
  const dialGroup = mk('dial');
  dialGroup.add(disc(Rdial, Z.dial, track(new THREE.MeshStandardMaterial({ map: dialTex, roughness: 0.5, metalness: 0.2 }))));

  // ── hands ─────────────────────────────────────────────────────
  const hands = buildHands(watch, variant, Rdial * 0.95);
  extraMaterials.push(...hands.materials);
  const handsGroup = mk('hands');
  hands.group.position.z = Z.hands;
  handsGroup.add(hands.group);

  // ── bezel ─────────────────────────────────────────────────────
  const bezel = mk('bezel');
  const bezBase = Z.midTop - 0.2;
  bezel.add(
    wall(R + 0.1, R + 0.1, bezBase, Z.bezelTop - 0.7, steel),
    wall(R - 0.6, R + 0.1, Z.bezelTop - 0.7, Z.bezelTop, steel),
    ring(opening, R - 0.6, Z.bezelTop, steel),
    wall(opening, opening, bezBase, Z.bezelTop, steelBack),
  );
  if (dive) {
    const innerR = opening;
    const outerR = R - 0.5;
    const canvas = document.createElement('canvas');
    drawBezelInsert(canvas, variant, innerR / outerR, 1024);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    extraTextures.push(tex);
    const insertMat = track(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.28, metalness: 0.15 }));
    bezel.add(ring(innerR, outerR, Z.bezelTop + 0.03, insertMat));

    const teeth = 120;
    const toothGeo = new THREE.BoxGeometry(0.55, 0.62, (Z.bezelTop - bezBase) * 0.8);
    const knurl = new THREE.InstancedMesh(toothGeo, steel, teeth);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      p.set(Math.cos(a) * (R + 0.15), Math.sin(a) * (R + 0.15), (bezBase + Z.bezelTop - 0.7) / 2 + 0.2);
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
      m.compose(p, q, one);
      knurl.setMatrixAt(i, m);
    }
    knurl.instanceMatrix.needsUpdate = true;
    bezel.add(knurl);
  }

  // ── crystal ───────────────────────────────────────────────────
  const crystal = mk('crystal');
  const crystalMat = track(new THREE.MeshPhysicalMaterial({
    color: watch.crystal?.tint ?? '#e8f0f6',
    transparent: true,
    opacity: 0.13,
    roughness: 0.02,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.6,
    depthWrite: false,
  }));
  const a = opening + 0.2;
  let crystalTop = Z.bezelTop - 0.5;
  if (domed) {
    const h = 1.7;
    const Rs = (a * a + h * h) / (2 * h);
    const cap = new THREE.SphereGeometry(Rs, 64, 16, 0, Math.PI * 2, 0, Math.asin(a / Rs)).rotateX(Math.PI / 2);
    cap.translate(0, 0, Z.bezelTop - 0.6 - (Rs - h));
    crystal.add(new THREE.Mesh(cap, crystalMat));
    crystalTop = Z.bezelTop - 0.6 + h;
  } else {
    const slab = new THREE.CylinderGeometry(a, a, 0.9, SEG).rotateX(Math.PI / 2);
    slab.translate(0, 0, Z.bezelTop - 0.5);
    crystal.add(new THREE.Mesh(slab, crystalMat));
    crystalTop = Z.bezelTop - 0.05;
  }

  // ── crown ─────────────────────────────────────────────────────
  const crown = mk('crown');
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 3.4, 20).rotateZ(-Math.PI / 2), steel);
  stem.position.set(R + 0.4, 0, 0);
  const headMat = track(steel.clone());
  headMat.flatShading = true;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 3.4, 24).rotateZ(-Math.PI / 2), headMat);
  head.position.set(R + 3.2, 0, 0);
  crown.add(stem, head);
  if (c.crownGuards) {
    const guardGeo = new RoundedBoxGeometry(3.8, 2.4, t * 0.48, 2, 0.5);
    for (const sy of [-1, 1]) {
      const g = new THREE.Mesh(guardGeo, steel);
      g.position.set(R + 0.8, sy * 4.4, 0);
      crown.add(g);
    }
  }

  // ── strap ─────────────────────────────────────────────────────
  const strap = buildStrap(watch, variant, { anisotropy });
  extraTextures.push(...strap.textures);
  strap.top.name = 'strapTop';
  strap.bottom.name = 'strapBottom';
  root.add(strap.top, strap.bottom);

  // ── hotspot anchors (parented to their part so they follow an explode) ──
  const anchor = (parent, x, y, z) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const rb = (opening + R) / 2;
  const hotspots = [
    { id: 'crystal', label: 'Crystal', anchor: anchor(crystal, -a * 0.58, a * 0.6, crystalTop), side: 'front' },
    { id: 'bezel', label: 'Bezel', anchor: anchor(bezel, rb * Math.cos(0.7), rb * Math.sin(0.7), Z.bezelTop + 0.2), side: 'front' },
    { id: 'crown', label: 'Crown', anchor: anchor(crown, R + 3.4, 0, 2.6), side: 'both' },
    { id: 'movement', label: 'Movement', anchor: anchor(movementRoot, 0, -R * 0.36, 0.5), side: 'both' },
    { id: 'strap', label: 'Strap', anchor: strap.anchor, side: 'both' },
  ];

  // ── camera presets (mm; the stage converts to world units) ────
  const views = {
    overview: { pos: [16, 9, 158], target: [0, 0, 0] },
    exploded: { pos: [92, 40, 150], target: [0, 0, 2] },
    crystal: { pos: [-36, 28, 86], target: [-6, 5, 2] },
    bezel: { pos: [42, 34, 92], target: [10, 8, 2] },
    // the target sits inside the case so the crown lands right of centre, clear of the info panel
    crown: { pos: [R + 58, 12, 60], target: [R - 10, 0, 0] },
    movement: { pos: [16, 14, -128], target: [-8, 0, -12] },
    strap: { pos: [-32, 74, 80], target: [0, 40, -4] },
  };

  // ── explode ───────────────────────────────────────────────────
  const explodeSet = [
    [parts.crystal, new THREE.Vector3(0, 0, 32), new THREE.Vector3()],
    [parts.bezel, new THREE.Vector3(0, 0, 22), new THREE.Vector3()],
    [parts.hands, new THREE.Vector3(0, 0, 14), new THREE.Vector3()],
    [parts.dial, new THREE.Vector3(0, 0, 6), new THREE.Vector3()],
    [parts.movement, new THREE.Vector3(0, 0, -12), movementRest],
    [parts.caseback, new THREE.Vector3(0, 0, -26), new THREE.Vector3()],
    [parts.crown, new THREE.Vector3(9, 0, 0), new THREE.Vector3()],
    [strap.top, new THREE.Vector3(0, 9, 0), new THREE.Vector3()],
    [strap.bottom, new THREE.Vector3(0, -9, 0), new THREE.Vector3()],
  ];
  let explodeAmount = 0;
  function setExplode(v) {
    explodeAmount = v;
    for (const [obj, off, rest] of explodeSet) obj.position.copy(rest).addScaledVector(off, v);
  }

  function setPartVisible(name, visible) {
    if (parts[name]) parts[name].visible = visible;
  }

  function update(now, seconds) {
    hands.update(now);
    if (explodeAmount > 0.02) movement.update(seconds);
  }

  function dispose() {
    root.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      mats.forEach((m) => m.dispose?.());
    });
    extraMaterials.forEach((m) => m.dispose?.());
    extraTextures.forEach((tx) => tx.dispose?.());
  }

  return {
    root,
    parts,
    hotspots,
    views,
    radius: R,
    bezelSpin: dive ? bezel : null,
    setExplode,
    setPartVisible,
    update,
    dispose,
  };
}
