import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initSmoothScroll } from './core/smooth-scroll.js';
import { initCursor } from './core/cursor.js';
import { initMagnetic } from './core/magnetic.js';
import { initSpotlight } from './core/spotlight.js';
import { initHero } from './hero/hero.js';
import { createShowcase } from './showcase/index.js';
import { createRouter } from './app/router.js';
import { createCollectionView } from './pages/collection.js';
import { createWatchView } from './pages/watch.js';
import { createHeritageView } from './pages/heritage.js';
import { createCraftView } from './pages/craft.js';
import { WATCHES } from './data/watches.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (sel) => document.querySelector(sel);

async function boot() {
  const scroll = initSmoothScroll();
  initCursor();
  initSpotlight();
  initMagnetic();

  // ── home: the hero and the 3D showcase are the heavy part, so they start the first time
  // the home view is shown. Landing on #collection never downloads three.js. ──
  let homeReady = null;
  function initHome() {
    homeReady ??= (async () => {
      const hero = await initHero({ root: $('#top') });
      const showcase = await createShowcase({ root: $('#showcase'), scroll }).catch((err) => {
        console.error('[showcase] failed to start', err);
        return null;
      });
      hero.play();
      ScrollTrigger.refresh();
      return { hero, showcase };
    })();
    return homeReady;
  }

  const home = {
    enter() {
      initHome(); // not awaited: the page shows at once, the stage fills in
    },
  };

  const watchView = createWatchView({
    el: $('[data-view="watch"]'),
    onOpen3d(id, variant) {
      window.dispatchEvent(new CustomEvent('orient:select', { detail: { id, variant } }));
      location.hash = 'showcase';
    },
  });

  const views = {
    home,
    collection: createCollectionView({ el: $('[data-view="collection"]') }),
    watch: watchView,
    heritage: createHeritageView({ el: $('[data-view="heritage"]') }),
    craft: createCraftView({ el: $('[data-view="craft"]') }),
    about: {}, // static page: nothing to build
  };

  window.addEventListener('orient:select', async (e) => {
    const { showcase } = await initHome();
    showcase?.select(e.detail.id, e.detail.variant ?? 0);
  });

  const titles = {
    home: 'Orient: six beats every second (concept)',
    collection: 'Collection · Orient concept',
    heritage: 'Heritage · Orient concept',
    craft: 'Craft · Orient concept',
    about: 'About this project · Orient concept',
  };
  const router = createRouter({
    views,
    scroll,
    titleFor: (route) => (route.view === 'watch' ? `${WATCHES.find((w) => w.id === route.id)?.name ?? 'Model'} · Orient concept` : titles[route.view]),
    onShow: () => {
      scroll.refresh?.();
      ScrollTrigger.refresh();
      initMagnetic();
      initSpotlight();
    },
  });

  // ── footer newsletter: a concept form, nothing leaves the page ──
  const form = $('#news');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.elements.email;
    const msg = $('#news-msg');
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    input.setAttribute('aria-invalid', String(!ok));
    msg.textContent = ok ? 'Thank you. This is a concept form, so nothing was sent.' : 'Enter an email address like name@example.com.';
    if (ok) input.value = '';
  });

  await router.start();
  document.documentElement.classList.add('is-ready');
}

boot().catch((err) => {
  console.error('[boot] failed', err);
  document.documentElement.classList.add('is-ready');
  document.querySelectorAll('[data-view]').forEach((el, i) => (el.hidden = i !== 0));
});
