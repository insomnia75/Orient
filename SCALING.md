# Scaling this further

## Add a model

Copy an entry in `src/data/watches.js`, change `id`, `name`, `jp`, `story`, numbers and colourways. The page `#watch-<id>` exists as soon as the entry does.

## Add a page

1. Add a view to `index.html`: `<div class="view page" data-view="press" hidden>…</div>`.
2. Create `src/pages/press.js` exporting `createPressView({ el })` with `enter()` and, if it adds listeners, `leave()`.
3. Register it in `src/main.js` (`views.press`), add its name to `parseRoute` in `src/app/router.js`, and a title in `main.js`.
4. Add a nav link: `<a href="#press" data-nav="press">`.

`enter()` may return `false` to send the visitor back to the collection (the model page does this for unknown ids).

## Real routes and SEO

Hash routes are right for a portfolio piece and for sandboxed hosting. For a production site, give each page its own HTML file or use Astro or Eleventy with the same `src/data` files, then set `<title>`, description and Open Graph tags per page. The views already render from data, so the same content can be generated at build time.

## More ideas

- **Photography.** Add `image` and `gallery` per model. The collection cards and model pages already use them in place of the drawn watch.
- **Real 3D.** Export the watch as a compressed GLB (Draco or Meshopt, under about 3 MB) and use the `glb` field.
- **Hotspots.** Rotor and winding, lume, the exhibition caseback, lug width. A hotspot is data in `parts` plus an anchor in `src/watch/build-watch.js`.
- **Heritage.** Add archival photos to `HISTORY` entries and render them in `src/pages/heritage.js`.
- **Craft.** More drawings in the style of `src/pages/craft.js`: escapement, mainspring barrel, hacking lever.
- **Hero movement.** Add a pallet fork and let the escape wheel step with the balance. It needs a stepped drive and a lower `HERO.speed`; the current hero keeps everything on smooth, slow motion on purpose.
- **Newsletter.** Point the form in `src/main.js` at Buttondown, Mailchimp or your own endpoint.

## Performance checklist

- Test on a mid-range phone with Lighthouse and the Performance panel. Watch long tasks while the hero scene runs.
- Self-host the fonts, subset them, and preload the display face.
- Serve photos as AVIF or WebP with explicit `width` and `height`.
- Move the libraries from the CDN into your own build (Vite, Astro) for one cache-friendly bundle.
- Keep `HERO.maxDpr` at or below 1.5. The scene is a soft background and a larger buffer only costs frames.

## Accessibility checklist

- Every hotspot is a button with a text label; keep it that way.
- After a page change the new `h1` takes focus, so screen readers announce the page. Keep one `h1` per view.
- The drawer traps focus and closes on Escape; reuse `createDrawer` for any new panel.
- Keep the reduced-motion paths. All animation is decoration.
