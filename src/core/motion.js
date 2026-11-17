/** Shared motion helpers. Orient's calibres beat 21,600 times an hour: 6 beats a second. */

export const BEAT = 1 / 6;

export const REDUCED =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const FINE_POINTER =
  typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Collapse a duration to 0 for people who ask for reduced motion. */
export const dur = (seconds) => (REDUCED ? 0 : seconds);

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
/** Frame-rate independent smoothing. lambda ~ 4 is gentle, ~ 12 is snappy. */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export const easeOutBack = (k, s = 1.1) => {
  const c3 = s + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
};

/**
 * Number of beats elapsed at time t (seconds), as a float that *snaps* to each whole beat
 * quickly (first `snap` of the beat) and then holds, like a real escapement.
 */
export function beats(t, snap = 0.2) {
  const b = t * 6;
  const n = Math.floor(b);
  const k = clamp((b - n) / snap, 0, 1);
  return n + easeOutBack(k);
}

/** Seconds until the next beat boundary on the shared page clock. */
export function nextBeatDelay() {
  const t = performance.now() / 1000;
  return BEAT - (t % BEAT);
}

/** Cheap WebGL capability probe (cached), so we can pick the 2D fallback before importing three. */
let webglOk;
export function webglAvailable() {
  if (webglOk !== undefined) return webglOk;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    webglOk = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglOk = false;
  }
  return webglOk;
}
