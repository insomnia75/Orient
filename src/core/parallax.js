import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REDUCED } from './motion.js';

/**
 * Scroll parallax. <div data-parallax="0.2"> drifts 20% of its own height over the
 * time its section crosses the viewport. Negative values drift the other way.
 */
export function initParallax(root = document) {
  if (REDUCED) return;
  gsap.registerPlugin(ScrollTrigger);

  root.querySelectorAll('[data-parallax]').forEach((el) => {
    const speed = parseFloat(el.dataset.parallax) || 0.2;
    gsap.fromTo(
      el,
      { yPercent: -speed * 50 },
      {
        yPercent: speed * 50,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      },
    );
  });
}
