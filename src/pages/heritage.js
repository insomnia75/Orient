import { HISTORY, SOURCES } from '../data/heritage.js';
import { h } from '../core/dom.js';
import { createGearTrain } from './gear-svg.js';
import { REDUCED, clamp } from '../core/motion.js';

/**
 * Heritage page. A gear train drawn as SVG turns with the scroll position; the timeline entry
 * nearest the middle of the screen lights up. Scroll work is one rAF write to three transforms.
 */
export function createHeritageView({ el }) {
  const list = el.querySelector('#timeline');
  const gearHost = el.querySelector('#gear-host');
  const sources = el.querySelector('#sources');
  const body = el.querySelector('.heritage__body');
  let built = false;
  let train = null;
  let io = null;
  let queued = false;
  let metrics = { top: 0, span: 1 };

  function measure() {
    const r = body.getBoundingClientRect();
    metrics = { top: r.top + window.scrollY, span: Math.max(1, r.height - window.innerHeight) };
  }
  function paint() {
    queued = false;
    train.setProgress(clamp((window.scrollY - metrics.top) / metrics.span, 0, 1));
  }
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  }

  function build() {
    list.replaceChildren(
      ...HISTORY.map((e) =>
        h(
          'li',
          { class: 'tl' },
          h('p', { class: 'tl__year font-display', text: String(e.year) }),
          h('p', { class: 'tl__era', lang: 'ja', text: e.era }),
          h('h3', { class: 'tl__title font-display', text: e.title }),
          h('p', { class: 'tl__body', text: e.body }),
        ),
      ),
    );
    sources.replaceChildren(...SOURCES.map((s) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.label }))));
    train = createGearTrain({ turns: 3 });
    gearHost.replaceChildren(train.el);
  }

  return {
    enter() {
      if (!built) {
        built = true;
        build();
      }
      measure();
      paint();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', measure);
      if (!REDUCED && 'IntersectionObserver' in window) {
        io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) e.target.classList.toggle('is-now', e.isIntersecting);
          },
          { rootMargin: '-46% 0px -46% 0px' },
        );
        list.querySelectorAll('.tl').forEach((n) => io.observe(n));
      } else {
        list.querySelectorAll('.tl').forEach((n) => n.classList.add('is-now'));
      }
    },
    leave() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      io?.disconnect();
      io = null;
    },
  };
}
