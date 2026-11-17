import * as THREE from 'three';
import { makeGearGeometry, meshAngle } from './gear-geometry.js';

const TAU = Math.PI * 2;

/** Côtes de Genève-style stripes for the bridge plate. */
function stripeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  for (let x = 0; x < 512; x += 16) {
    const g = ctx.createLinearGradient(x, 0, x + 16, 0);
    g.addColorStop(0, '#8a7a58');
    g.addColorStop(0.5, '#d9c690');
    g.addColorStop(1, '#8a7a58');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 16, 512);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * A stylised automatic movement: striped bridge, a small going train, a free-spinning rotor,
 * and a balance wheel that oscillates at 3 Hz (21,600 beats an hour = 6 beats a second).
 * Detail faces +Z locally; the builder rotates the group so it faces the caseback.
 * @param {number} radius  movement radius in mm
 */
export function buildMovement(radius) {
  const group = new THREE.Group();
  const disposables = [];

  const stripes = stripeTexture();
  disposables.push(stripes);
  const plateMat = new THREE.MeshStandardMaterial({ map: stripes, metalness: 0.85, roughness: 0.38 });
  const steel = new THREE.MeshStandardMaterial({ color: '#c8cdd4', metalness: 1, roughness: 0.25 });
  const brass = new THREE.MeshStandardMaterial({ color: '#c49a52', metalness: 1, roughness: 0.3 });
  const ruby = new THREE.MeshStandardMaterial({ color: '#c8203a', metalness: 0.2, roughness: 0.15, emissive: '#400410' });

  const plate = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1.2, 72).rotateX(Math.PI / 2), plateMat);
  group.add(plate);

  // Going train: W0 drives W1 and W2.
  const train = [
    { id: 'w0', T: 30, m: 0.45, pos: [-3.5, 1.0], mat: brass, spokes: 5 },
    { id: 'w1', T: 14, m: 0.45, parent: 'w0', phi: 0.6, mat: steel, spokes: 0 },
    { id: 'w2', T: 22, m: 0.45, parent: 'w0', phi: -0.9, mat: steel, spokes: 4 },
  ];
  const nodes = {};
  for (const g of train) {
    const { geometry, pitchR } = makeGearGeometry({ teeth: g.T, module: g.m, thickness: 0.7, spokes: g.spokes });
    const mesh = new THREE.Mesh(geometry, g.mat);
    let x;
    let y;
    if (g.parent) {
      const p = nodes[g.parent];
      x = p.x + Math.cos(g.phi) * (p.pitchR + pitchR);
      y = p.y + Math.sin(g.phi) * (p.pitchR + pitchR);
    } else {
      [x, y] = g.pos;
    }
    mesh.position.set(x, y, 1.0);
    group.add(mesh);
    nodes[g.id] = { ...g, mesh, pitchR, x, y };

    const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), ruby);
    jewel.position.set(x, y, 1.5);
    group.add(jewel);
  }

  // Balance wheel with hairspring
  const balance = new THREE.Group();
  balance.position.set(6.2, -3.0, 2.3);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.38, 10, 48), brass);
  balance.add(rim);
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.4, 0.3), brass);
    spoke.rotation.z = (i / 3) * Math.PI;
    balance.add(spoke);
  }
  const spiral = [];
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * TAU * 4;
    const r = 0.5 + (i / 120) * 2.2;
    spiral.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.15));
  }
  balance.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral), 160, 0.07, 5), steel));
  group.add(balance);

  // Rotor (half-disc weight)
  const rotor = new THREE.Group();
  rotor.position.z = 3.6;
  const rShape = new THREE.Shape();
  rShape.absarc(0, 0, radius * 0.88, 0, Math.PI, false);
  rShape.absarc(0, 0, radius * 0.22, Math.PI, 0, true);
  rShape.closePath();
  const rGeo = new THREE.ExtrudeGeometry(rShape, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 1, curveSegments: 32 });
  rotor.add(new THREE.Mesh(rGeo, brass));
  rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, 1.4, 32).rotateX(Math.PI / 2), steel));
  group.add(rotor);

  // Rim screws
  const screwGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.5, 14).rotateX(Math.PI / 2);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    const s = new THREE.Mesh(screwGeo, steel);
    s.position.set(Math.cos(a) * (radius - 1.4), Math.sin(a) * (radius - 1.4), 0.85);
    group.add(s);
  }

  function update(t) {
    // Balance: ±~80° at 3 Hz
    balance.rotation.z = Math.sin(t * TAU * 3) * 1.4;
    const w0 = nodes.w0;
    const r0 = t * 0.35;
    w0.mesh.rotation.z = r0;
    for (const id of ['w1', 'w2']) {
      const n = nodes[id];
      n.mesh.rotation.z = meshAngle(r0, w0.T, n.T, n.phi);
    }
    rotor.rotation.z = t * 0.7;
  }

  return { group, update, textures: disposables };
}
