import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REDUCED } from './motion.js';

/**
 * Lenis smooth scrolling, driven by the GSAP ticker so ScrollTrigger stays in sync.
 * Returns a small controller; with reduced motion it degrades to native scrolling.
 */
export function initSmoothScroll() {
  gsap.registerPlugin(ScrollTrigger);

  if (REDUCED) {
    return {
      lenis: null,
      stop() {},
      start() {},
      scrollTo(target) {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        el?.scrollIntoView();
      },
      toTop() {
        window.scrollTo(0, 0);
      },
      refresh() {},
    };
  }

  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return {
    lenis,
    stop: () => lenis.stop(),
    start: () => lenis.start(),
    scrollTo: (target, opts) => lenis.scrollTo(target, { duration: 1.4, ...opts }),
    toTop: (immediate = true) => {
      lenis.scrollTo(0, { immediate });
      if (immediate) window.scrollTo(0, 0);
    },
    refresh: () => lenis.resize?.(),
  };
}
