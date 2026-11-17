import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitWords } from '../core/split.js';
import { REDUCED, BEAT, nextBeatDelay, webglAvailable } from '../core/motion.js';

/**
 * Hero: one orchestrated moment. The headline's words land on the beat of the gear train
 * behind them (6 beats a second), then the rest of the copy follows.
 * Falls back to a static, CSS-only background if WebGL or three.js is unavailable.
 */
export async function initHero({ root }) {
  gsap.registerPlugin(ScrollTrigger);

  const title = root.querySelector('.hero__title');
  const lede = root.querySelector('.hero__lede');
  const jp = root.querySelector('.hero__jp');
  const cta = root.querySelector('.cta');
  const note = root.querySelector('.hero__note');
  const vertical = root.querySelector('.hero__vertical');
  const canvas = root.querySelector('#hero-canvas');

  const words = splitWords(title);
  gsap.set(words, { yPercent: 115 });
  gsap.set([jp, lede, cta, note].filter(Boolean), { opacity: 0, y: 14 });
  gsap.set(vertical, { opacity: 0 });
  title.classList.add('is-split');

  let scene = null;
  if (webglAvailable()) {
    try {
      const { createHeroScene } = await import('./hero-scene.js');
      scene = createHeroScene({ canvas, container: root });
    } catch (err) {
      console.warn('[hero] 3D background unavailable, using the static background.', err);
    }
  }
  if (!scene) root.classList.add('hero--static');

  function play() {
    const start = REDUCED ? 0 : nextBeatDelay() + BEAT * 2;
    const tl = gsap.timeline({ delay: start });
    // One word per two beats: each lands as a tooth passes.
    words.forEach((w, i) => {
      tl.to(w, { yPercent: 0, duration: REDUCED ? 0 : 0.5, ease: 'power4.out' }, i * BEAT * 2);
    });
    const after = words.length * BEAT * 2;
    tl.to(jp, { opacity: 1, y: 0, duration: REDUCED ? 0 : 0.8, ease: 'power3.out' }, after);
    tl.to(lede, { opacity: 1, y: 0, duration: REDUCED ? 0 : 0.8, ease: 'power3.out' }, after + 0.12);
    tl.to(cta, { opacity: 1, y: 0, duration: REDUCED ? 0 : 0.8, ease: 'power3.out' }, after + 0.27);
    if (note) tl.to(note, { opacity: 1, y: 0, duration: REDUCED ? 0 : 0.8, ease: 'power3.out' }, after + 0.42);
    tl.to(vertical, { opacity: 1, duration: REDUCED ? 0 : 1.2 }, after);
    scene?.start();
  }

  if (!REDUCED) {
    // Copy drifts up slightly and the gears recede as the showcase arrives.
    gsap.to('.hero__copy', {
      yPercent: -14,
      ease: 'none',
      scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true },
    });
    ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: 'bottom top',
      onUpdate: (self) => scene?.setScroll(self.progress),
    });
  }

  return { play, scene };
}
