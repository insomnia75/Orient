import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeGearGeometry } from '../watch/gear-geometry.js';
import { TRAIN, MODULE, BALANCE, PLATE, layoutTrain, poseTrain, balancePose } from './hero-layout.js';
import { HERO, DEFAULT_ACCENT } from '../config.js';
import { REDUCED, damp, clamp } from '../core/motion.js';
import { createQuality } from '../core/perf.js';

const TAU = Math.PI * 2;

/** Perlage: the overlapping-circle finish on a movement's main plate. */
function perlageTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2a2d31';
  ctx.fillRect(0, 0, size, size);
  const cell = 16;
  for (let row = -1; row <= size / cell + 1; row++) {
    for (let col = -1; col <= size / cell + 1; col++) {
      const x = col * cell + (row % 2 ? cell / 2 : 0);
      const y = row * cell * 0.86;
      const g = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, cell * 0.62);
      g.addColorStop(0, 'rgba(255,255,255,0.20)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.04)');
      g.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, cell * 0.62, 0, TAU);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(11, 11);
  t.anisotropy = 2;
  return t;
}

/**
 * Hero background: a slow watch movement seen from above. A mainspring barrel drives a short train
 * of thin wheels; a balance wheel swings beside it. Everything moves smoothly, and the speed of
 * each wheel stays low enough that no tooth skips more than a fraction of a pitch per frame.
 */
export function createHeroScene({ canvas, container }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, alpha: true, powerPreference: 'default' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = HERO.exposure;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.16).texture;
  scene.environmentIntensity = HERO.envIntensity;

  const camera = new THREE.PerspectiveCamera(HERO.fov, 1, 0.1, 80);
  camera.position.set(0, 0, HERO.cameraZ);

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-4, 5, 8);
  const cursorLight = new THREE.PointLight(DEFAULT_ACCENT, HERO.cursorLight, 0, 2);
  cursorLight.position.set(2, 1, 3.5);
  scene.add(key, cursorLight);

  // ── materials ─────────────────────────────────────────────────
  const perlage = perlageTexture();
  const mat = {
    // rhodium, ink-black steel and champagne gold: the site's own palette, in metal
    steel: new THREE.MeshStandardMaterial({ color: '#cfd2d6', metalness: 1, roughness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: '#4a5059', metalness: 1, roughness: 0.32 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c9a96a', metalness: 1, roughness: 0.3 }),
    blued: new THREE.MeshStandardMaterial({ color: '#2b3b55', metalness: 0.9, roughness: 0.32 }),
    ruby: new THREE.MeshStandardMaterial({ color: '#b3232d', metalness: 0.1, roughness: 0.16, emissive: '#2e060a' }),
    plate: new THREE.MeshStandardMaterial({ map: perlage, color: '#9a9fa6', metalness: 0.85, roughness: 0.55 }),
  };
  const springMat = new THREE.LineBasicMaterial({ color: '#7d93ae', transparent: true, opacity: 0.85 });
  const geoms = [];
  const keep = (g) => (geoms.push(g), g);

  const cluster = new THREE.Group();
  scene.add(cluster);
  const flat = (r, h, seg = 32) => keep(new THREE.CylinderGeometry(r, r, h, seg).rotateX(Math.PI / 2)); // axis along Z
  const place = (mesh, x, y, z) => (mesh.position.set(x, y, z), cluster.add(mesh), mesh);

  // ── main plate ────────────────────────────────────────────────
  place(new THREE.Mesh(flat(PLATE.radius, 0.12, 96), mat.plate), PLATE.pos[0], PLATE.pos[1], PLATE.z);
  const plateRim = new THREE.Mesh(keep(new THREE.TorusGeometry(PLATE.radius, 0.04, 6, 120)), mat.steel);
  place(plateRim, PLATE.pos[0], PLATE.pos[1], PLATE.z + 0.06);
  // blued screws round the edge
  for (const deg of [18, 74, 142, 206, 262, 318]) {
    const a = (deg * Math.PI) / 180;
    const x = PLATE.pos[0] + Math.cos(a) * (PLATE.radius - 0.55);
    const y = PLATE.pos[1] + Math.sin(a) * (PLATE.radius - 0.55);
    place(new THREE.Mesh(flat(0.13, 0.05, 20), mat.blued), x, y, PLATE.z + 0.09);
    const slot = place(new THREE.Mesh(keep(new THREE.BoxGeometry(0.2, 0.025, 0.02)), mat.dark), x, y, PLATE.z + 0.12);
    slot.rotation.z = a + 0.6;
  }

  // ── gear train ────────────────────────────────────────────────
  const nodes = layoutTrain();
  for (const g of TRAIN) {
    const n = nodes[g.id];
    const { geometry } = makeGearGeometry({ teeth: n.T, module: MODULE, thickness: n.th, spokes: n.spokes, profile: n.profile, bore: n.bore });
    keep(geometry);
    n.mesh = place(new THREE.Mesh(geometry, mat[n.tone]), n.x, n.y, n.z);
  }

  // arbors and ruby jewels: one per axle, spanning the stack that shares it
  const axles = new Map();
  for (const n of Object.values(nodes)) {
    const key = `${n.x.toFixed(3)},${n.y.toFixed(3)}`;
    const a = axles.get(key) || { x: n.x, y: n.y, lo: Infinity, hi: -Infinity };
    a.lo = Math.min(a.lo, n.z - n.th / 2);
    a.hi = Math.max(a.hi, n.z + n.th / 2);
    axles.set(key, a);
  }
  for (const a of axles.values()) {
    const isBarrel = Math.abs(a.x - nodes.barrel.x) < 1e-6 && Math.abs(a.y - nodes.barrel.y) < 1e-6;
    const arbor = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.05, 0.05, a.hi - a.lo + 0.14, 12).rotateX(Math.PI / 2)), mat.steel);
    place(arbor, a.x, a.y, (a.hi + a.lo) / 2);
    if (isBarrel) continue; // the barrel has its own cap and screw
    place(new THREE.Mesh(keep(new THREE.TorusGeometry(0.13, 0.03, 8, 24)), mat.brass), a.x, a.y, a.hi + 0.04); // chaton
    place(new THREE.Mesh(flat(0.09, 0.05, 16), mat.ruby), a.x, a.y, a.hi + 0.05);
  }

  // barrel cap and engraved rings (the barrel is a closed drum)
  const barrel = nodes.barrel;
  const barrelTop = barrel.z + barrel.th / 2 + 0.006;
  for (const f of [0.52, 0.74]) {
    place(new THREE.Mesh(keep(new THREE.TorusGeometry(barrel.pitchR * f, 0.014, 4, 96)), mat.brass), barrel.x, barrel.y, barrelTop);
  }
  place(new THREE.Mesh(flat(barrel.pitchR * 0.24, 0.03, 48), mat.steel), barrel.x, barrel.y, barrelTop + 0.012);
  place(new THREE.Mesh(flat(0.1, 0.05, 16), mat.blued), barrel.x, barrel.y, barrelTop + 0.04);

  // ── balance wheel + hairspring ────────────────────────────────
  const R = BALANCE.radius;
  const balance = new THREE.Group();
  balance.add(new THREE.Mesh(keep(new THREE.TorusGeometry(R, 0.055, 8, 72)), mat.brass));
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Mesh(keep(new THREE.BoxGeometry(R, 0.075, 0.04)), mat.brass);
    const a = (i / 3) * TAU + 0.5;
    arm.position.set(Math.cos(a) * (R / 2), Math.sin(a) * (R / 2), 0);
    arm.rotation.z = a;
    balance.add(arm);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const screw = new THREE.Mesh(flat(0.065, 0.1, 12), mat.steel);
    screw.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    balance.add(screw);
  }
  balance.add(new THREE.Mesh(flat(0.17, 0.08, 24), mat.brass));

  const spring = (() => {
    const pts = [];
    const turns = 7;
    const steps = 260;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const r = R * (0.1 + 0.56 * u);
      const a = u * turns * TAU;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, -0.05));
    }
    return new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(pts)), springMat);
  })();
  balance.add(spring);
  const balanceJewel = new THREE.Mesh(flat(0.07, 0.06, 16), mat.ruby);
  balanceJewel.position.set(0, 0, 0.06); // three.js positions are read-only properties: set them, never assign them
  balance.add(balanceJewel);
  place(balance, BALANCE.pos[0], BALANCE.pos[1], BALANCE.z);

  function drive(t) {
    poseTrain(nodes, t, HERO.speed);
    for (const n of Object.values(nodes)) n.mesh.rotation.z = n.rot;
    const { angle, breathe } = balancePose(t);
    balance.rotation.z = angle;
    spring.rotation.z = -angle * 0.4;
    spring.scale.setScalar(breathe);
  }

  // ── dust ──────────────────────────────────────────────────────
  const sprite = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const N = HERO.particles;
  const positions = new Float32Array(N * 3);
  const speeds = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 22;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 2] = 0.8 + Math.random() * 6;
    speeds[i] = 0.05 + Math.random() * 0.15;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.06,
    map: sprite,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: DEFAULT_ACCENT,
  });
  scene.add(new THREE.Points(dustGeo, dustMat));

  // ── layout / resize ───────────────────────────────────────────
  let aspect = 1;
  const quality = createQuality({ max: HERO.maxDpr, min: 0.75, onChange: () => resize() });
  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setPixelRatio(quality.dpr);
    renderer.setSize(w, h, false);
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    // On tall/narrow screens tuck the movement behind the copy instead of beside it.
    const narrow = aspect < 1;
    cluster.scale.setScalar(narrow ? 0.62 : 1);
    cluster.position.set(narrow ? -1.6 : 0, narrow ? 3.6 : 0, 0);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ── pointer + scroll ──────────────────────────────────────────
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => {
    ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
    ptr.ty = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  let scroll = 0;

  // ── loop ──────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = performance.now() / 1000;
    quality.tick(dt);

    ptr.x = damp(ptr.x, ptr.tx, 3, dt);
    ptr.y = damp(ptr.y, ptr.ty, 3, dt);
    camera.position.x = ptr.x * 0.6;
    camera.position.y = ptr.y * 0.4;
    camera.position.z = HERO.cameraZ + scroll * 5;
    camera.lookAt(0, 0, 0);

    // light under the cursor, projected onto the plane z = 3.5
    const dist = camera.position.z - 3.5;
    const halfH = Math.tan((HERO.fov * Math.PI) / 360) * dist;
    cursorLight.position.x += (ptr.x * halfH * aspect - cursorLight.position.x) * (1 - Math.exp(-8 * dt));
    cursorLight.position.y += (ptr.y * halfH - cursorLight.position.y) * (1 - Math.exp(-8 * dt));

    drive(t);

    const arr = dustGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      arr[i * 3 + 1] += speeds[i] * dt;
      if (arr[i * 3 + 1] > 6) arr[i * 3 + 1] = -6;
    }
    dustGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  let running = false;
  function start() {
    if (running) return;
    if (REDUCED) {
      drive(30);
      renderer.render(scene, camera);
      return;
    }
    running = true;
    clock.getDelta();
    renderer.setAnimationLoop(frame);
  }
  function stop() {
    running = false;
    renderer.setAnimationLoop(null);
  }

  const io = new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop()), { threshold: 0 });
  io.observe(container);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);

  return {
    start,
    stop,
    setScroll(p) {
      scroll = clamp(p, 0, 1);
    },
    setAccent(color) {
      cursorLight.color.set(color);
      dustMat.color.set(color);
    },
    destroy() {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
      geoms.forEach((g) => g.dispose());
      Object.values(mat).forEach((m) => m.dispose());
      springMat.dispose();
      perlage.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      sprite.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
