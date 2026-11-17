import gsap from 'gsap';
import { REDUCED } from '../core/motion.js';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Slide-in specifications drawer. Accessible modal: focus moves in, Tab is trapped,
 * Escape closes, background is inert and scroll is paused while it is open.
 *
 * @param {object} o
 * @param {HTMLElement} o.root          the .drawer element
 * @param {HTMLElement[]} o.inertTargets elements to make inert while open
 * @param {{stop():void,start():void}} [o.scroll] smooth-scroll controller
 */
export function createDrawer({ root, inertTargets = [], scroll }) {
  const panel = root.querySelector('.drawer__panel');
  const $ = (id) => root.querySelector(id);
  const els = {
    title: $('#drawer-title'),
    ref: $('#drawer-ref'),
    blurb: $('#drawer-blurb'),
    specs: $('#drawer-specs'),
    colours: $('#drawer-colours'),
    gallery: $('#drawer-gallery'),
  };
  let opener = null;
  let isOpen = false;
  let hideTimer = 0;

  function setContent(watch, variantIndex = 0) {
    const variant = watch.variants[variantIndex] ?? watch.variants[0];
    els.title.textContent = watch.name;
    els.ref.textContent = variant.ref ? `Reference ${variant.ref}, ${variant.name.toLowerCase()} dial` : `${variant.name} dial`;
    els.blurb.textContent = watch.blurb;

    els.specs.replaceChildren(
      ...watch.specs.flatMap((s) => {
        const dt = document.createElement('dt');
        dt.textContent = s.label;
        const dd = document.createElement('dd');
        dd.textContent = s.value;
        return [dt, dd];
      }),
    );

    els.colours.replaceChildren();
    if (watch.variants.length > 1) {
      const h = document.createElement('h3');
      h.textContent = 'Colourways';
      h.className = 'font-display';
      const list = document.createElement('ul');
      watch.variants.forEach((v) => {
        const li = document.createElement('li');
        const sw = document.createElement('span');
        sw.className = 'swatch-dot';
        sw.style.setProperty('--sw', v.dial);
        sw.setAttribute('aria-hidden', 'true');
        li.append(sw, document.createTextNode(v.ref ? `${v.name} (${v.ref})` : v.name));
        list.append(li);
      });
      els.colours.append(h, list);
    }

    els.gallery.replaceChildren();
    (watch.gallery ?? []).forEach((img) => {
      const el = document.createElement('img');
      el.src = img.src;
      el.alt = img.alt ?? `${watch.name}`;
      el.loading = 'lazy';
      els.gallery.append(el);
    });
  }

  function trap(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => !el.hidden && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function open(trigger) {
    if (isOpen) return;
    isOpen = true;
    opener = trigger ?? document.activeElement;
    clearTimeout(hideTimer);
    root.hidden = false;
    inertTargets.forEach((el) => (el.inert = true));
    scroll?.stop();
    // next frame so the transition runs from the closed state
    requestAnimationFrame(() => {
      root.classList.add('is-open');
      if (!REDUCED) {
        gsap.fromTo(
          [...panel.querySelectorAll('.drawer__specs dt, .drawer__specs dd, .drawer__colours li')],
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.025, delay: 0.25, ease: 'power3.out' },
        );
      }
      panel.querySelector('.drawer__close').focus();
    });
    document.addEventListener('keydown', trap);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    root.classList.remove('is-open');
    inertTargets.forEach((el) => (el.inert = false));
    scroll?.start();
    document.removeEventListener('keydown', trap);
    hideTimer = setTimeout(() => (root.hidden = true), REDUCED ? 0 : 500);
    opener?.focus?.();
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-drawer]')) close();
  });

  return { setContent, open, close, get isOpen() { return isOpen; } };
}
