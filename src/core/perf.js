/**
 * Adaptive render quality. Feed it the frame time and it lowers the pixel ratio when the
 * device cannot keep up (average frame over ~28 ms, i.e. under ~36 fps). It only ever
 * steps down, so quality never oscillates. `onChange(dpr)` should resize the renderer.
 */
export function createQuality({ max = 1.5, min = 0.75, step = 0.25, onChange } = {}) {
  let dpr = Math.min(window.devicePixelRatio || 1, max);
  let acc = 0;
  let frames = 0;
  let settle = 0;

  return {
    get dpr() {
      return dpr;
    },
    tick(dt) {
      if (settle > 0) {
        settle--;
        return;
      }
      acc += dt;
      frames++;
      if (frames < 40) return;
      const avg = acc / frames;
      acc = 0;
      frames = 0;
      if (avg > 0.028 && dpr > min) {
        dpr = Math.max(min, +(dpr - step).toFixed(2));
        settle = 20; // ignore the frames right after a resize
        onChange?.(dpr);
      }
    },
  };
}
