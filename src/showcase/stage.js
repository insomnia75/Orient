import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { buildWatch } from '../watch/build-watch.js';
import { MM, STAGE, DEFAULT_ACCENT } from '../config.js';
import { REDUCED, damp, clamp } from '../core/motion.js';
import { createQuality } from '../core/perf.js';

const toWorld = (arr) => new THREE.Vector3(arr[0], arr[1], arr[2]).multiplyScalar(MM);

/**
 * The interactive 3D stage: floating watch, orbit controls, cursor-following light,
 * exploded view, camera flights and HTML hotspots tracked to 3D anchors.
 *
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {HTMLElement} o.container    element whose size the canvas fills
 * @param {HTMLElement} o.hotspotLayer overlay that receives hotspot buttons
 * @param {(id: string) => void} o.onHotspot
 */
export async function createWatchStage({ canvas, container, hotspotLayer, onHotspot }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, alpha: true, powerPreference: 'default' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = STAGE.exposure;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = STAGE.envIntensity;

  const camera = new THREE.PerspectiveCamera(STAGE.fov, 1, 0.1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.6;
  controls.minDistance = STAGE.minDistance;
  controls.maxDistance = STAGE.maxDistance;

  // Lights: soft key, cool rim, and a point light that follows the cursor.
  const key = new THREE.DirectionalLight(0xffffff, STAGE.keyLight);
  key.position.set(3, 4, 6);
  const rim = new THREE.DirectionalLight(0x9db8ff, STAGE.rimLight);
  rim.position.set(-5, 2, -4);
  const cursorLight = new THREE.PointLight(DEFAULT_ACCENT, STAGE.cursorLight, 0, 2);
  cursorLight.position.set(0, 0, 2.5);
  scene.add(key, rim, cursorLight);

  // float → sway → watch. `float` carries transitions, `sway` the idle motion and pointer tilt.
  const float = new THREE.Group();
  const sway = new THREE.Group();
  float.add(sway);
  scene.add(float);

  let current = null;
  let hotspotEls = [];
  let hotspotsOn = false;
  let token = 0;
  let userExploded = false;
  let focusedPart = null;
  const exp = { v: 0 };

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, inside: false };
  const lightTarget = new THREE.Vector3(0, 0, 2.5);
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.5);

  // ── sizing ────────────────────────────────────────────────────
  const size = { w: 1, h: 1 };
  const quality = createQuality({ max: STAGE.maxDpr, min: 0.75, onChange: () => resize() });
  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    size.w = w;
    size.h = h;
    renderer.setPixelRatio(quality.dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.zoom = camera.aspect < 1 ? clamp(camera.aspect * 1.2, 0.5, 1) : 1;
    // Push the watch right on wide screens so it clears the info panel.
    const shift = w > 900 ? STAGE.desktopShift : 0;
    camera.setViewOffset(w, h, -w * shift, 0, w, h);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ── pointer: tilt + light ─────────────────────────────────────
  const onPointerMove = (e) => {
    const r = container.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    pointer.inside = nx > -1 && nx < 1 && ny > -1 && ny < 1;
    if (pointer.inside) {
      pointer.tx = nx;
      pointer.ty = ny;
    }
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // ── hotspots ──────────────────────────────────────────────────
  function mountHotspots(spots) {
    hotspotLayer.replaceChildren();
    hotspotEls = spots.map((spot) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hotspot is-hidden';
      b.dataset.part = spot.id;
      b.dataset.cursor = 'Details';
      b.setAttribute('aria-label', `${spot.label}: show details`);
      b.innerHTML = '<span class="hotspot__dot"></span><span class="hotspot__label"></span>';
      b.querySelector('.hotspot__label').textContent = spot.label;
      b.addEventListener('click', () => onHotspot?.(spot.id));
      hotspotLayer.append(b);
      return { el: b, spot };
    });
  }

  const tmpV = new THREE.Vector3();
  const camLocal = new THREE.Vector3();
  function updateHotspots() {
    if (!current || !hotspotEls.length) return;
    const { w, h } = size;
    camLocal.copy(camera.position);
    current.root.worldToLocal(camLocal);
    const front = camLocal.z > 0;
    for (const { el, spot } of hotspotEls) {
      spot.anchor.getWorldPosition(tmpV);
      tmpV.project(camera);
      const x = (tmpV.x * 0.5 + 0.5) * w;
      const y = (-tmpV.y * 0.5 + 0.5) * h;
      const sideOk = spot.side === 'both' || (spot.side === 'front' && front);
      const visible = hotspotsOn && tmpV.z < 1 && sideOk && !(focusedPart && focusedPart !== spot.id);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.classList.toggle('is-hidden', !visible);
    }
  }

  // ── camera flights ────────────────────────────────────────────
  let flight = null;
  function flyTo(view, duration = 1.3) {
    flight?.kill();
    const pos = toWorld(view.pos);
    const tgt = toWorld(view.target);
    if (REDUCED) {
      camera.position.copy(pos);
      controls.target.copy(tgt);
      controls.update();
      return Promise.resolve();
    }
    controls.enabled = false;
    flight = gsap.timeline({
      onUpdate: () => controls.update(),
      onComplete: () => (controls.enabled = true),
    });
    flight.to(camera.position, { x: pos.x, y: pos.y, z: pos.z, duration, ease: 'power3.inOut' }, 0);
    flight.to(controls.target, { x: tgt.x, y: tgt.y, z: tgt.z, duration, ease: 'power3.inOut' }, 0);
    return flight;
  }

  // ── explode ───────────────────────────────────────────────────
  function tweenExplode(to, duration = 1.4) {
    if (!current) return Promise.resolve();
    if (REDUCED) {
      exp.v = to;
      current.setExplode(to);
      return Promise.resolve();
    }
    return gsap.to(exp, { v: to, duration, ease: 'power3.inOut', onUpdate: () => current?.setExplode(exp.v) });
  }

  async function setExploded(on) {
    userExploded = on;
    if (!current) return;
    focusedPart = null;
    current.setPartVisible('caseback', true);
    await Promise.all([tweenExplode(on ? 1 : 0), flyTo(on ? current.views.exploded : current.views.overview, 1.5)]);
  }

  async function focusPart(id) {
    if (!current) return { exploded: false };
    focusedPart = id;
    if (!id) {
      current.setPartVisible('caseback', true);
      const explodedNow = userExploded;
      await Promise.all([tweenExplode(explodedNow ? 1 : 0), flyTo(explodedNow ? current.views.exploded : current.views.overview)]);
      return { exploded: explodedNow };
    }
    const needsExplode = id === 'movement';
    current.setPartVisible('caseback', id !== 'movement');
    await Promise.all([tweenExplode(needsExplode || userExploded ? 1 : 0), flyTo(current.views[id])]);
    if (id === 'bezel' && current.bezelSpin && !REDUCED) clickBezel();
    return { exploded: needsExplode || userExploded };
  }

  function clickBezel() {
    const spin = current?.bezelSpin;
    if (!spin) return;
    const tl = gsap.timeline();
    for (let i = 0; i < 8; i++) {
      tl.to(spin.rotation, { z: `+=${Math.PI / 60}`, duration: 0.05, ease: 'power1.out' }, i * 0.09);
    }
  }

  // ── model lifecycle ───────────────────────────────────────────
  async function loadGlb(watch) {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(watch.glb.url);
    const root = gltf.scene;
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const wrap = new THREE.Group();
    wrap.add(root);
    wrap.scale.setScalar((watch.glb.scale ?? 42) / Math.max(size.x, size.y)); // fit to ~case size in mm
    const holder = new THREE.Group();
    holder.add(wrap);
    const anchors = watch.glb.anchors ?? {};
    const hotspots = Object.entries(anchors).map(([id, p]) => {
      const o = new THREE.Object3D();
      o.position.set(p[0], p[1], p[2]);
      holder.add(o);
      return { id, label: watch.parts?.[id]?.title ?? id, anchor: o, side: 'both' };
    });
    return {
      root: holder,
      parts: {},
      hotspots,
      views: {
        overview: { pos: [16, 9, 158], target: [0, 0, 0] },
        exploded: { pos: [16, 9, 158], target: [0, 0, 0] },
      },
      radius: 21,
      bezelSpin: null,
      setExplode() {},
      setPartVisible() {},
      update() {},
      dispose() {
        holder.traverse((o) => {
          o.geometry?.dispose?.();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m?.dispose?.());
        });
      },
    };
  }

  async function instantiate(watch, variant) {
    if (watch.glb?.url) {
      try {
        return await loadGlb(watch);
      } catch (err) {
        console.warn('[stage] glTF failed, using the procedural model instead.', err);
      }
    }
    return buildWatch(watch, variant, { anisotropy: renderer.capabilities.getMaxAnisotropy() });
  }

  function swapIn(model) {
    if (current) {
      sway.remove(current.root);
      current.dispose();
    }
    current = model;
    current.root.scale.setScalar(MM);
    sway.add(current.root);
    exp.v = 0;
    userExploded = false;
    focusedPart = null;
    current.setExplode(0);
    mountHotspots(current.hotspots);
  }

  async function setWatch(watch, variantIndex = 0, { animate = true } = {}) {
    const my = ++token;
    const variant = watch.variants[variantIndex] ?? watch.variants[0];
    hotspotsOn = false;
    cursorLight.color.set(variant.accent ?? DEFAULT_ACCENT);

    const model = await instantiate(watch, variant);
    if (my !== token) {
      model.dispose();
      return;
    }

    const first = !current;
    if (!first && animate && !REDUCED) {
      gsap.to(float.rotation, { y: '+=1.2', duration: 0.4, ease: 'power2.in' });
      await gsap.to(float.scale, { x: 0.86, y: 0.86, z: 0.86, duration: 0.4, ease: 'power2.in' });
      if (my !== token) {
        model.dispose();
        return;
      }
    }

    swapIn(model);
    flyTo(current.views.overview, first || REDUCED ? 0.01 : 0.9);

    if (REDUCED) {
      float.rotation.y = 0;
      float.scale.setScalar(1);
    } else {
      float.rotation.y = first ? -0.9 : -1.2;
      float.scale.setScalar(first ? 0.9 : 0.86);
      gsap.to(float.rotation, { y: 0, duration: 1.2, ease: 'expo.out' });
      await gsap.to(float.scale, { x: 1, y: 1, z: 1, duration: 1, ease: 'expo.out' });
    }
    if (my === token) hotspotsOn = true;
  }

  // ── render loop ───────────────────────────────────────────────
  const clock = new THREE.Clock();
  let swayTime = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    quality.tick(dt);
    const now = new Date();
    const seconds = clock.elapsedTime;

    pointer.x = damp(pointer.x, pointer.inside ? pointer.tx : 0, 4, dt);
    pointer.y = damp(pointer.y, pointer.inside ? pointer.ty : 0, 4, dt);

    if (!REDUCED) {
      swayTime += dt;
      sway.rotation.y = Math.sin(swayTime * 0.5) * 0.08 + pointer.x * 0.12;
      sway.rotation.x = -pointer.y * 0.08;
      float.position.y = Math.sin(swayTime * 0.8) * 0.04;
    }

    // Cursor light follows the pointer across a plane just in front of the watch.
    raycaster.setFromCamera(new THREE.Vector2(pointer.x, pointer.y), camera);
    if (raycaster.ray.intersectPlane(plane, lightTarget)) {
      cursorLight.position.lerp(lightTarget, 1 - Math.exp(-8 * dt));
    }

    current?.update(now, seconds);
    controls.update();
    updateHotspots();
    renderer.render(scene, camera);
  }

  let running = false;
  function start() {
    if (running) return;
    running = true;
    clock.getDelta();
    renderer.setAnimationLoop(frame);
  }
  function stop() {
    running = false;
    renderer.setAnimationLoop(null);
  }

  const io = new IntersectionObserver(
    ([entry]) => (entry.isIntersecting && !document.hidden ? start() : stop()),
    { threshold: 0.01 },
  );
  io.observe(container);
  const onVis = () => (document.hidden ? stop() : container.getBoundingClientRect().height && start());
  document.addEventListener('visibilitychange', onVis);

  start();

  return {
    kind: 'webgl',
    capabilities: { explode: true, hotspots: true },
    setWatch,
    setExploded,
    focusPart,
    setAccent(color) {
      cursorLight.color.set(color);
    },
    destroy() {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVis);
      controls.dispose();
      current?.dispose();
      pmrem.dispose();
      renderer.dispose();
      hotspotLayer.replaceChildren();
    },
  };
}
