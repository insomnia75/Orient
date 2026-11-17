/**
 * Cursor-following glow. Any element with data-spotlight gets --mx / --my CSS variables
 * (pointer position inside the element); the CSS paints a radial highlight there.
 * Writes are batched into one requestAnimationFrame and the element rect is cached on
 * pointer enter, so moving the mouse never forces layout.
 */
export function bindSpotlight(el) {
  if (el.__spot) return;
  el.__spot = true;
  let rect = null;
  let x = 0;
  let y = 0;
  let queued = false;

  const flush = () => {
    queued = false;
    el.style.setProperty('--mx', `${x}px`);
    el.style.setProperty('--my', `${y}px`);
  };
  el.addEventListener('pointerenter', () => {
    rect = el.getBoundingClientRect();
  });
  el.addEventListener(
    'pointermove',
    (e) => {
      rect ??= el.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
      if (!queued) {
        queued = true;
        requestAnimationFrame(flush);
      }
    },
    { passive: true },
  );
  el.addEventListener('pointerleave', () => {
    rect = null;
  });
}

export function initSpotlight(root = document) {
  root.querySelectorAll('[data-spotlight]').forEach(bindSpotlight);
}
