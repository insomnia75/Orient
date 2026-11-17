import gsap from 'gsap';
import { FINE_POINTER, REDUCED } from './motion.js';

const managed = new Set();
let bound = false;

/**
 * Magnetic buttons. Mark an element with data-magnetic="0.35" (pull strength) and, optionally,
 * a child with data-magnetic-inner that moves a little further for a parallax feel.
 * Safe to call again after you add new elements: already-managed ones are skipped.
 */
export function initMagnetic(root = document) {
  if (!FINE_POINTER || REDUCED) return;

  root.querySelectorAll('[data-magnetic]').forEach((el) => {
    if ([...managed].some((m) => m.el === el)) return;
    const inner = el.querySelector('[data-magnetic-inner]');
    managed.add({
      el,
      inner,
      strength: parseFloat(el.dataset.magnetic) || 0.35,
      x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'elastic.out(1, 0.45)' }),
      y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'elastic.out(1, 0.45)' }),
      ix: inner ? gsap.quickTo(inner, 'x', { duration: 0.9, ease: 'elastic.out(1, 0.45)' }) : null,
      iy: inner ? gsap.quickTo(inner, 'y', { duration: 0.9, ease: 'elastic.out(1, 0.45)' }) : null,
      active: false,
    });
  });

  if (bound) return;
  bound = true;

  window.addEventListener(
    'pointermove',
    (e) => {
      for (const m of managed) {
        if (!m.el.isConnected) {
          managed.delete(m);
          continue;
        }
        const r = m.el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const reach = Math.max(r.width, r.height) * 0.75; // field extends beyond the element
        const inside = Math.hypot(dx, dy) < reach;
        if (inside) {
          m.active = true;
          m.x(dx * m.strength);
          m.y(dy * m.strength);
          m.ix?.(dx * m.strength * 0.5);
          m.iy?.(dy * m.strength * 0.5);
        } else if (m.active) {
          m.active = false;
          m.x(0);
          m.y(0);
          m.ix?.(0);
          m.iy?.(0);
        }
      }
    },
    { passive: true },
  );
}
