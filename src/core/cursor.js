import gsap from 'gsap';
import { FINE_POINTER, REDUCED } from './motion.js';

/**
 * Custom cursor: a dot that tracks the pointer and a ring that trails it.
 * - any <a>/<button> grows the ring
 * - [data-cursor="Label"] turns the ring into a filled disc with that label
 * Disabled on touch devices and for reduced-motion users (native cursor stays).
 */
export function initCursor() {
  if (!FINE_POINTER || REDUCED) return () => {};

  const make = (cls) => Object.assign(document.createElement('div'), { className: cls });
  const dot = make('cursor-dot');
  const ring = make('cursor-ring');
  const label = Object.assign(document.createElement('span'), { className: 'cursor-label' });
  ring.append(label);
  document.body.append(dot, ring);
  document.documentElement.classList.add('has-cursor');

  gsap.set([dot, ring], { xPercent: -50, yPercent: -50, opacity: 0 });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });

  let shown = false;
  const onMove = (e) => {
    if (!shown) {
      shown = true;
      gsap.set([dot, ring], { x: e.clientX, y: e.clientY });
      gsap.to([dot, ring], { opacity: 1, duration: 0.3 });
    }
    dx(e.clientX);
    dy(e.clientY);
    rx(e.clientX);
    ry(e.clientY);
  };

  const onOver = (e) => {
    const labelled = e.target.closest?.('[data-cursor]');
    const interactive = e.target.closest?.('a, button, [role="button"], summary');
    if (labelled && labelled.dataset.cursor) {
      label.textContent = labelled.dataset.cursor;
      ring.classList.add('is-label');
    } else {
      ring.classList.remove('is-label');
    }
    ring.classList.toggle('is-link', !!interactive && !labelled);
  };

  const onDown = () => ring.classList.add('is-down');
  const onUp = () => ring.classList.remove('is-down');
  const onLeave = () => gsap.to([dot, ring], { opacity: 0, duration: 0.2 }) && (shown = false);

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerover', onOver, { passive: true });
  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  document.documentElement.addEventListener('pointerleave', onLeave);

  return () => {
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerover', onOver);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    dot.remove();
    ring.remove();
    document.documentElement.classList.remove('has-cursor');
  };
}
