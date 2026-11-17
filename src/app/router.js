import { REDUCED } from '../core/motion.js';

/**
 * Tiny hash router. One document, several views (`<div data-view="…">`).
 *
 *   #home (or empty)   hero + 3D showcase        #showcase      home, scrolled to the showcase
 *   #collection        every model               #watch-<id>    one model, e.g. #watch-kamasu
 *   #heritage          history timeline          #craft         how a mechanical watch works
 *   #about             notes on this project
 *
 * Hash-only routes work on any static host and inside sandboxed iframes. Every in-page link
 * (<a href="#…">) goes through here, so smooth-scroll never fights the router.
 */
export function parseRoute(raw) {
  const hash = (raw || '').replace(/^#/, '');
  if (hash.startsWith('watch-')) return { view: 'watch', id: hash.slice(6), key: hash };
  if (hash === 'collection' || hash === 'heritage' || hash === 'craft' || hash === 'about') return { view: hash, key: hash };
  if (hash === 'showcase') return { view: 'home', anchor: 'showcase', key: 'home' };
  return { view: 'home', key: 'home' };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function createRouter({ views, scroll, onShow, titleFor }) {
  const main = document.querySelector('#main');
  const veil = document.querySelector('.veil');
  const navLinks = [...document.querySelectorAll('[data-nav]')];
  let current = null;
  let token = 0;

  function toAnchor(route) {
    const target = route.anchor ? document.getElementById(route.anchor) : null;
    if (target) scroll.scrollTo(target);
    else scroll.toTop();
  }

  async function navigate(raw) {
    const route = parseRoute(raw);
    const mine = ++token;
    if (current && current.key === route.key) {
      toAnchor(route);
      return;
    }
    const view = views[route.view];
    if (!view) return;
    const first = !current;
    const animate = !first && !REDUCED && veil;

    if (animate) {
      veil.classList.add('is-on');
      await wait(220);
      if (mine !== token) return;
    }

    if (current) views[current.view]?.leave?.();
    document.querySelectorAll('[data-view]').forEach((el) => {
      el.hidden = el.dataset.view !== route.view;
    });
    scroll.toTop(true);
    const ok = await view.enter?.(route);
    if (mine !== token) return;
    if (ok === false) {
      // unknown model id: go home rather than show an empty page
      location.hash = 'collection';
      return;
    }
    current = route;

    document.title = titleFor(route);
    navLinks.forEach((a) => {
      const active = a.dataset.nav === (route.view === 'watch' ? 'collection' : route.view);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    onShow?.(route);
    if (route.anchor) toAnchor(route);
    if (!first) {
      const heading = document.querySelector(`[data-view="${route.view}"] h1`);
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    }
    if (animate) {
      await wait(30);
      veil.classList.remove('is-on');
    }
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
    const href = a.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    if (a.hasAttribute('data-skip')) {
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: false });
      return;
    }
    if (location.hash === href || (!location.hash && href === '#home')) navigate(href);
    else location.hash = href.slice(1);
  });
  window.addEventListener('hashchange', () => navigate(location.hash));

  return { navigate, start: () => navigate(location.hash) };
}
