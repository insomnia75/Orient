import * as THREE from 'three';

const X = new THREE.Vector3(1, 0, 0);

/** Centre line of one half of the strap: leaves the lugs, then curls back round the wrist. */
function strapCurve(side, lugToLug) {
  const y = lugToLug / 2;
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, side * (y - 3), -1.0),
      new THREE.Vector3(0, side * (y + 8), -2.4),
      new THREE.Vector3(0, side * (y + 20), -7.5),
      new THREE.Vector3(0, side * (y + 28), -17),
      new THREE.Vector3(0, side * (y + 30), -30),
    ],
    false,
    'centripetal',
  );
}

/** A flat band swept along a curve (separate vertices per face so edges stay crisp). */
function ribbonGeometry(curve, w0, w1, thickness, flip) {
  const segs = 56;
  const len = curve.getLength();
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];

  const frames = [];
  for (let i = 0; i <= segs; i++) {
    const s = i / segs;
    const p = curve.getPointAt(s);
    const T = curve.getTangentAt(s).normalize();
    const B = new THREE.Vector3().crossVectors(X, T).normalize();
    if (flip) B.negate();
    frames.push({ p, B, w: THREE.MathUtils.lerp(w0, w1, s), s });
  }

  const face = (cornerA, cornerB, normalFn, uvFn) => {
    const base = pos.length / 3;
    frames.forEach((f, i) => {
      const a = cornerA(f);
      const b = cornerB(f);
      const n = normalFn(f);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      nor.push(n.x, n.y, n.z, n.x, n.y, n.z);
      uv.push(...uvFn(f, 0, len), ...uvFn(f, 1, len));
      if (i < segs) {
        const k = base + i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    });
  };

  const half = thickness / 2;
  const at = (f, dx, dy) => f.p.clone().addScaledVector(X, (f.w / 2) * dx).addScaledVector(f.B, half * dy);
  const uvTop = (f, side, L) => [side, (f.s * L) / 12];

  face((f) => at(f, -1, 1), (f) => at(f, 1, 1), (f) => f.B, uvTop);
  face((f) => at(f, 1, -1), (f) => at(f, -1, -1), (f) => f.B.clone().negate(), uvTop);
  face((f) => at(f, -1, -1), (f) => at(f, -1, 1), () => X.clone().negate(), uvTop);
  face((f) => at(f, 1, 1), (f) => at(f, 1, -1), () => X.clone(), uvTop);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function leatherTexture(color, stitch) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(0, 0, 7, 256);
  ctx.fillRect(249, 0, 7, 256);
  if (stitch) {
    ctx.strokeStyle = 'rgba(236,230,214,0.75)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    for (const x of [24, 232]) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Both halves of the strap or bracelet. Returns groups that can be exploded independently.
 * @returns {{ top: THREE.Group, bottom: THREE.Group, anchor: THREE.Object3D, textures: THREE.Texture[] }}
 */
export function buildStrap(watch, variant, { anisotropy = 4 } = {}) {
  const def = { ...watch.strap, ...(variant.strap ?? {}) };
  const l2l = watch.case.lugToLug;
  const w0 = watch.case.lugWidth;
  const w1 = w0 - 2;
  const textures = [];

  const top = new THREE.Group();
  const bottom = new THREE.Group();

  [[top, 1], [bottom, -1]].forEach(([group, side]) => {
    const curve = strapCurve(side, l2l);

    if (def.type === 'bracelet') {
      const steel = new THREE.MeshStandardMaterial({ color: def.color, metalness: 1, roughness: 0.2 });
      const satin = new THREE.MeshStandardMaterial({ color: def.color, metalness: 1, roughness: 0.42 });
      const pitch = 5.2;
      const len = curve.getLength();
      const n = Math.floor(len / pitch);
      const centre = new THREE.InstancedMesh(new THREE.BoxGeometry(w0 * 0.44, pitch * 0.92, 3.1), steel, n);
      const sides = new THREE.InstancedMesh(new THREE.BoxGeometry(w0 * 0.24, pitch * 0.84, 2.8), satin, n * 2);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const sc = new THREE.Vector3();
      const pos = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        const s = (i + 0.5) / n;
        const p = curve.getPointAt(s);
        const T = curve.getTangentAt(s).normalize();
        const B = new THREE.Vector3().crossVectors(X, T).normalize();
        const basis = new THREE.Matrix4().makeBasis(X, T, B);
        q.setFromRotationMatrix(basis);
        const k = THREE.MathUtils.lerp(1, w1 / w0, s);
        sc.set(k, 1, 1);
        m.compose(p, q, sc);
        centre.setMatrixAt(i, m);
        for (const [j, sign] of [[0, -1], [1, 1]]) {
          pos.copy(p).addScaledVector(X, sign * w0 * 0.34 * k);
          m.compose(pos, q, sc);
          sides.setMatrixAt(i * 2 + j, m);
        }
      }
      centre.instanceMatrix.needsUpdate = true;
      sides.instanceMatrix.needsUpdate = true;
      group.add(centre, sides);
    } else {
      const tex = leatherTexture(def.color ?? '#4a3224', def.type === 'leather' && def.stitch);
      tex.anisotropy = anisotropy;
      textures.push(tex);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: def.type === 'rubber' ? 0.5 : 0.72,
        metalness: 0,
        side: THREE.DoubleSide,
      });
      group.add(new THREE.Mesh(ribbonGeometry(curve, w0, w1, 3.2, side < 0), mat));
    }
  });

  const anchor = new THREE.Object3D();
  anchor.position.copy(strapCurve(1, l2l).getPointAt(0.22)).add(new THREE.Vector3(0, 0, 2.2));
  top.add(anchor);

  return { top, bottom, anchor, textures };
}
