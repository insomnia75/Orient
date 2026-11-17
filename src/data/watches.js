/**
 * ONE FILE DRIVES THE WHOLE SHOWCASE.
 * Add, remove or edit entries here and the rail, filters, 3D stage, hotspots and
 * specification drawer all follow. Nothing else needs to change.
 *
 * Specifications come from public manufacturer / retailer listings (checked Nov 2026):
 *  - Bambino V7 38 mm  https://shop.orientwatchusa.com/products/ra-ac0m01s30b
 *  - Kamasu            https://shop.orientwatchusa.com/products/ra-aa0814r19b
 *                      https://orient-watch.com/Collections/ORIENT/Sports/ORIENT:-Mechanical-Sports-Watch/p/RA-AA0822L
 *  - Mako II           https://twobrokewatchsnobs.com/orient-mako-ii-review-faa02002d9/
 *                      https://www.watchia.com/world/orient-mako-ii-automatic-faa02009d9.html
 *  - Sun & Moon V3     https://orientwatchusa.com/collections/classic/ra-ak0010b10b
 *  - Orient Star M45 F7 Small Second (launched Mar 2026)
 *                      https://orient-watch.com/en/orientstar/collection/classic/m45_f7_small-second/RE-BS0001E/
 *                      https://orient-watch.com/en/orientstar/collection/classic/m45_f7_small-second/RE-BS0003N/
 *                      https://www.orientwatch.co.uk/or/en_GB/brands/orient-star/orient-star-m45-f7-small-seconds/p/RE-BS0001E
 * Dial colours, marker styles and hand shapes are illustrative renderings, not product photography.
 * Verify every figure against the current Orient listing before publishing.
 *
 * ── Schema ────────────────────────────────────────────────────────────────────
 * id, name, series ('classic' | 'sport' | 'contemporary'), tagline, blurb
 * jp       Japanese name shown on the model page (katakana or kanji)
 * story    [paragraph, paragraph] shown on the model page
 * image     optional  card photo URL (replaces the generated dial thumbnail)
 * gallery   optional  [{ src, alt }] shown in the specification drawer
 * glb       optional  { url, scale, anchors } load your own glTF instead of the procedural watch (experimental)
 * case      { diameter, thickness, lugToLug, lugWidth (mm), finish, metal, exhibition, crownGuards }
 * bezel     { type: 'fixed' | 'dive120' }
 * crystal   { type: 'flat' | 'domed', tint }
 * strap     { type: 'leather' | 'rubber' | 'bracelet', color, stitch }
 * dial      { markers, hands, track, brand, brandY, lower[], complications[], finish }
 * variants  [{ id, name, dial, marker, lume, hands, second, accent, finish, insert, strap, ref }]
 * parts     { crystal, movement, bezel, crown, strap } → { title, body } shown when a hotspot is opened
 * specs     [{ label, value }] shown in the drawer
 */

export const SERIES = [
  { id: 'all', label: 'All', jp: '全て' },
  { id: 'classic', label: 'Classic', jp: 'クラシック' },
  { id: 'sport', label: 'Sport', jp: 'スポーツ' },
  { id: 'contemporary', label: 'Contemporary', jp: 'コンテンポラリー' },
];

export const WATCHES = [
  {
    id: 'bambino',
    jp: 'バンビーノ',
    story: [
      "The Bambino is Orient’s dress watch: a slim case, a domed crystal and a dial that stays quiet. This version sits at 38 mm.",
      "Behind the dial runs the F6724, Orient’s own automatic calibre with about 40 hours of reserve. The exhibition caseback lets you watch it work.",
    ],
    name: 'Bambino',
    series: 'classic',
    tagline: 'A dress watch with a domed crystal and a visible movement.',
    blurb: 'The Version 7 steps down to 38 mm. A domed crystal, a slim case and a window on the calibre behind it.',
    image: null,
    gallery: [],
    case: { diameter: 38.4, thickness: 12.5, lugToLug: 44, lugWidth: 20, finish: 'polished', metal: '#cfd3d8', exhibition: true },
    bezel: { type: 'fixed' },
    crystal: { type: 'domed', tint: '#eef3ee' },
    strap: { type: 'leather', color: '#5a3b2a', stitch: true },
    dial: {
      markers: 'arabic',
      hands: 'dauphine',
      track: 'railroad',
      brand: 'ORIENT',
      brandY: -0.42,
      lower: ['AUTOMATIC'],
      complications: ['date'],
      finish: 'matte',
    },
    variants: [
      { id: 'white', name: 'White', dial: '#f2f0e8', marker: '#23272d', hands: '#3b4048', second: '#3b4048', accent: '#e8ecf2', ref: 'RA-AC0M01S30B' },
      { id: 'cream', name: 'Cream yellow', dial: '#e9dcae', marker: '#2a2620', hands: '#8c7a4a', second: '#8c7a4a', accent: '#ecdca0', strap: { color: '#8a6a45' }, ref: 'RA-AC0M05G10B' },
      { id: 'blue', name: 'Blue', dial: '#27406b', marker: '#eae8e0', hands: '#d6dae0', second: '#d6dae0', accent: '#7ea4de', strap: { color: '#23252b' }, ref: null },
    ],
    parts: {
      crystal: { title: 'Domed mineral crystal', body: 'The curve catches light the way a vintage dress watch does. Mineral is easier to scratch than sapphire, which is the trade for the soft, old-fashioned reflections.' },
      movement: { title: 'Calibre F6724', body: 'Automatic, with hand-winding and a stop-seconds hand for exact setting. 22 jewels, 21,600 beats an hour, about 40 hours of reserve. It is visible through the exhibition caseback.' },
      bezel: { title: 'Fixed polished bezel', body: 'A slim, stationary bezel keeps the dial open and uncluttered. Nothing to turn, nothing to catch on a cuff.' },
      crown: { title: 'Push/pull crown', body: 'Pull it out to set time and date, push it in to close. Water resistance is 30 m, which covers splashes and rain, not swimming.' },
      strap: { title: 'Leather strap, 20 mm', body: 'Stitched leather on a pin buckle, 20 mm at the lugs. Swap it in a minute for any 20 mm strap.' },
    },
    specs: [
      { label: 'Movement', value: 'Calibre F6724, automatic with hand-winding and hacking' },
      { label: 'Power reserve', value: 'About 40 hours' },
      { label: 'Beat rate', value: '21,600 beats an hour' },
      { label: 'Case', value: '38.4 mm without crown, 12.5 mm thick, 44 mm lug to lug' },
      { label: 'Crystal', value: 'Domed mineral' },
      { label: 'Water resistance', value: '30 m' },
      { label: 'Lug width', value: '20 mm' },
      { label: 'Caseback', value: 'Exhibition' },
    ],
    stats: [
      { label: 'Case', value: '38.4 mm' },
      { label: 'Water resistance', value: '30 m' },
      { label: 'Power reserve', value: '40 h' },
    ],
  },

  {
    id: 'kamasu',
    jp: 'カマス',
    story: [
      "Kamasu is the nickname collectors gave to the third generation of the Mako diver. In Japanese, kamasu is the barracuda.",
      "It pairs a sapphire crystal and 200 m of water resistance with the F6922, a calibre that hand-winds and hacks, so you can set the time to the second.",
    ],
    name: 'Kamasu',
    series: 'sport',
    tagline: 'A 200 m diver named after the barracuda.',
    blurb: 'Teeth-like markers and hands, a sapphire crystal and a 120-click bezel on a 41.8 mm case.',
    image: null,
    gallery: [],
    case: { diameter: 41.8, thickness: 12.8, lugToLug: 46.8, lugWidth: 22, finish: 'polished', metal: '#c3c8ce', exhibition: false, crownGuards: true },
    bezel: { type: 'dive120' },
    crystal: { type: 'flat', tint: '#dde8f4' },
    strap: { type: 'bracelet', color: '#b9bec5' },
    dial: {
      markers: 'kamasu',
      hands: 'arrow',
      track: 'ticks',
      brand: 'ORIENT',
      brandY: -0.5,
      lower: ['AUTOMATIC', '200m'],
      complications: ['day-date'],
      finish: 'matte',
    },
    variants: [
      { id: 'black', name: 'Black', dial: '#0d0f12', marker: '#e8e6df', lume: '#d9f0c6', hands: '#cdd2d8', second: '#cdd2d8', insert: '#101216', accent: '#9bb0c9', ref: 'RA-AA0005B39B' },
      { id: 'green', name: 'Green', dial: '#17493c', finish: 'sunray', marker: '#e8e6df', lume: '#d9f0c6', hands: '#cdd2d8', second: '#cdd2d8', insert: '#0f2f27', accent: '#3fb594', ref: 'RA-AA0004E19A' },
      { id: 'blue', name: 'Blue', dial: '#143a78', finish: 'sunray', marker: '#e8e6df', lume: '#d9f0c6', hands: '#cdd2d8', second: '#cdd2d8', insert: '#0e2a58', accent: '#4f8be0', ref: 'RA-AA0002L19B' },
      { id: 'burgundy', name: 'Burgundy', dial: '#5b1426', finish: 'sunray', marker: '#e8e6df', lume: '#d9f0c6', hands: '#cdd2d8', second: '#cdd2d8', insert: '#3b0c18', accent: '#d0566e', ref: 'RA-AA0814R19B' },
    ],
    parts: {
      crystal: { title: 'Sapphire crystal', body: 'Flat sapphire is the hard-wearing choice for a tool watch. It resists scratches from the knocks a diver takes.' },
      movement: { title: 'Calibre F6922', body: 'Automatic with hand-winding and hacking, plus day and date. 22 jewels, 21,600 beats an hour, about 40 hours of reserve. Orient rates its accuracy from −15 to +25 seconds a day.' },
      bezel: { title: '120-click bezel', body: 'A unidirectional stainless steel bezel with 120 clicks. It only turns counter-clockwise, so an accidental bump can only shorten a dive time, never lengthen it.' },
      crown: { title: 'Screw-down crown', body: 'Threaded into the case so it seals like a bolt. With the screwed caseback it gives 200 m of water resistance.' },
      strap: { title: 'Steel bracelet, 22 mm', body: 'Stainless steel links with a fold-over clasp and a double push-button safety.' },
    },
    specs: [
      { label: 'Movement', value: 'Calibre F6922, automatic with hand-winding and hacking' },
      { label: 'Power reserve', value: 'About 40 hours' },
      { label: 'Beat rate', value: '21,600 beats an hour' },
      { label: 'Case', value: '41.8 mm without crown, 12.8 mm thick, 46.8 mm lug to lug' },
      { label: 'Crystal', value: 'Sapphire' },
      { label: 'Water resistance', value: '200 m' },
      { label: 'Bezel', value: 'Unidirectional, 120 clicks, stainless steel' },
      { label: 'Crown', value: 'Screw-down' },
      { label: 'Lug width', value: '22 mm' },
      { label: 'Clasp', value: 'Fold-over with double push-button safety' },
    ],
    stats: [
      { label: 'Case', value: '41.8 mm' },
      { label: 'Water resistance', value: '200 m' },
      { label: 'Power reserve', value: '40 h' },
    ],
  },

  {
    id: 'mako',
    jp: 'マコ',
    story: [
      "Mako II arrived in 2016, alongside the Ray II, with the new F6 family of in-house calibres.",
      "It keeps the 200 m case and gains a movement that hacks and hand-winds, which the older calibre could not do.",
    ],
    name: 'Mako',
    series: 'sport',
    tagline: 'The original affordable diver, rebuilt around the F6922.',
    blurb: 'Mako II keeps the familiar 200 m case and swaps in a movement that hacks and hand-winds.',
    image: null,
    gallery: [],
    case: { diameter: 41.5, thickness: 13, lugToLug: 47, lugWidth: 22, finish: 'polished', metal: '#c3c8ce', exhibition: false, crownGuards: true },
    bezel: { type: 'dive120' },
    crystal: { type: 'domed', tint: '#e9f1ee' },
    strap: { type: 'bracelet', color: '#b4b9c0' },
    dial: {
      markers: 'baton',
      hands: 'sword',
      track: 'ticks',
      brand: 'ORIENT',
      brandY: -0.5,
      lower: ['AUTOMATIC', '200m'],
      complications: ['day-date'],
      finish: 'sunray',
    },
    variants: [
      { id: 'blue', name: 'Blue', dial: '#1b4f98', marker: '#ecebe4', lume: '#dff3cc', hands: '#d3d8de', second: '#d3d8de', insert: '#123a74', accent: '#4d8fe8', ref: 'FAA02009D9' },
      { id: 'black', name: 'Black', dial: '#101215', marker: '#ecebe4', lume: '#dff3cc', hands: '#d3d8de', second: '#e0a43c', insert: '#0d0f12', accent: '#d9a441', ref: null },
    ],
    parts: {
      crystal: { title: 'Mineral crystal', body: 'Mako II uses mineral glass, a sensible match for its price. If you want sapphire in the same family, the Kamasu is the step up.' },
      movement: { title: 'Calibre F6922', body: 'The movement that made Mako II interesting: automatic, hand-winding, hacking. It replaced the older 46943, which could not hack or hand-wind. About 40 hours of reserve at 21,600 beats an hour.' },
      bezel: { title: 'Unidirectional bezel', body: 'A rotating dive bezel with a click for every step. Set it to the minute hand when you start, read elapsed time when you finish.' },
      crown: { title: 'Screw-down crown', body: 'The crown threads into the case and, with the screwed caseback, gives 200 m of water resistance.' },
      strap: { title: 'Steel bracelet, 22 mm', body: 'Stainless steel bracelet on 22 mm lugs, with a fold-over clasp and a safety lock.' },
    },
    specs: [
      { label: 'Movement', value: 'Calibre F6922, automatic with hand-winding and hacking' },
      { label: 'Power reserve', value: 'About 40 hours' },
      { label: 'Beat rate', value: '21,600 beats an hour' },
      { label: 'Case', value: 'About 41.5 mm, 13 mm thick, 47 mm lug to lug' },
      { label: 'Crystal', value: 'Mineral' },
      { label: 'Water resistance', value: '200 m' },
      { label: 'Bezel', value: 'Unidirectional, stainless steel' },
      { label: 'Lug width', value: '22 mm' },
    ],
    stats: [
      { label: 'Case', value: '41.5 mm' },
      { label: 'Water resistance', value: '200 m' },
      { label: 'Power reserve', value: '40 h' },
    ],
  },

  {
    id: 'sun-moon',
    jp: 'サン＆ムーン',
    story: [
      "A half-moon aperture on the dial shows day or night through a rotating disc, next to the day and the date.",
      "It runs on the F6B24 with about 40 hours of reserve. The domed sapphire crystal and the exhibition caseback keep it a dress watch at heart.",
    ],
    name: 'Sun & Moon',
    series: 'contemporary',
    tagline: 'A day-and-night window set into a classic dial.',
    blurb: 'A sapphire dress watch with a half-moon aperture that shows whether it is day or night.',
    image: null,
    gallery: [],
    case: { diameter: 42.5, thickness: 14, lugToLug: 50.5, lugWidth: 22, finish: 'polished', metal: '#cdd1d6', exhibition: true },
    bezel: { type: 'fixed' },
    crystal: { type: 'domed', tint: '#dfe9f6' },
    strap: { type: 'leather', color: '#1f2430', stitch: true },
    dial: {
      markers: 'roman',
      hands: 'dauphine',
      track: 'railroad',
      brand: 'ORIENT',
      brandY: 0.1,
      lower: ['AUTOMATIC'],
      complications: ['sunmoon', 'date'],
      finish: 'sunray',
    },
    variants: [
      { id: 'black', name: 'Black', dial: '#14161a', marker: '#e9e6dd', hands: '#d6dae0', second: '#d6dae0', accent: '#bac6d8', strap: { color: '#2a1d16' }, ref: 'RA-AK0010B10B' },
      { id: 'blue', name: 'Blue', dial: '#1d3d78', marker: '#e9e6dd', hands: '#d6dae0', second: '#d6dae0', accent: '#6c9bd8', strap: { color: '#22406e' }, ref: 'RA-AK0011D10B' },
    ],
    parts: {
      crystal: { title: 'Domed sapphire crystal', body: 'A curved sapphire crystal. It keeps the vintage profile of the dial and resists scratches far better than mineral.' },
      movement: { title: 'Calibre F6B24', body: 'Automatic with hand-winding and hacking. It drives the day and date and the day/night disc. 22 jewels, 21,600 beats an hour, about 40 hours of reserve.' },
      bezel: { title: 'Fixed polished bezel', body: 'A stationary stainless steel bezel frames the dial and its half-moon aperture.' },
      crown: { title: 'Push/pull crown', body: 'Pull to set the time, day and date. Water resistance is 50 m, enough for the odd shower or splash.' },
      strap: { title: 'Leather strap, 22 mm', body: 'Stitched leather on a deployant clasp, 22 mm at the lugs.' },
    },
    specs: [
      { label: 'Movement', value: 'Calibre F6B24, automatic with hand-winding and hacking' },
      { label: 'Power reserve', value: 'About 40 hours' },
      { label: 'Beat rate', value: '21,600 beats an hour' },
      { label: 'Case', value: '42.5 mm without crown, 14 mm thick, 50.5 mm lug to lug' },
      { label: 'Crystal', value: 'Domed sapphire' },
      { label: 'Water resistance', value: '50 m' },
      { label: 'Complications', value: 'Day, date, day/night disc' },
      { label: 'Lug width', value: '22 mm' },
      { label: 'Caseback', value: 'Exhibition' },
    ],
    stats: [
      { label: 'Case', value: '42.5 mm' },
      { label: 'Water resistance', value: '50 m' },
      { label: 'Power reserve', value: '40 h' },
    ],
  },

  {
    id: 'orient-star',
    jp: 'オリエントスター',
    story: [
      "Orient Star is the company's higher line, dating back to 1951. The M45 F7 Small Second arrived in 2026 as a compact dress watch: 39 mm, leaf-shaped hands, Roman numerals, a small seconds dial at six and a power reserve indicator at twelve.",
      "It runs on the F7H44, with 50 hours of reserve, hand-winding and hacking. The rotor and bridges carry Geneva stripes and chamfered edges, visible through the sapphire caseback. There is no date, so the dial stays symmetrical.",
    ],
    name: 'Orient Star',
    series: 'classic',
    tagline: 'A compact dress watch with small seconds and a power reserve window.',
    blurb: "Orient's higher line in a 39 mm case: a sandblasted dial, a dual-curve sapphire crystal, small seconds at six and a power reserve indicator at twelve.",
    image: null,
    gallery: [],
    case: { diameter: 39, thickness: 11.7, lugToLug: 45.7, lugWidth: 20, finish: 'polished', metal: '#cfd3d8', exhibition: true },
    bezel: { type: 'fixed' },
    crystal: { type: 'domed', tint: '#e8f0f2' },
    strap: { type: 'leather', color: '#4a3324', stitch: true },
    dial: {
      markers: 'roman',
      hands: 'leaf',
      track: 'railroad',
      brand: 'ORIENT STAR',
      brandY: 0.12,
      lower: [],
      complications: ['power-reserve', 'small-seconds'],
      finish: 'sandblast',
    },
    variants: [
      { id: 'green', name: 'Green', dial: '#3a5848', marker: '#ebe6d4', hands: '#dfe2de', second: '#dfe2de', accent: '#86b49a', strap: { color: '#4a3324' }, ref: 'RE-BS0001E' },
      { id: 'ivory', name: 'Ivory', dial: '#e6dfca', marker: '#2b2823', hands: '#3b4149', second: '#3b4149', accent: '#d9cca4', strap: { color: '#6a4a32' }, ref: 'RE-BS0002S' },
      { id: 'grey', name: 'Grey, 75th anniversary edition', dial: '#5e636a', marker: '#eceae2', hands: '#d8dce2', second: '#d8dce2', accent: '#aab2c0', strap: { color: '#1f1d1c' }, ref: 'RE-BS0003N' },
    ],
    parts: {
      crystal: { title: 'Dual-curve sapphire crystal', body: 'Sapphire with an anti-reflective coating on both sides. The glass curves over the edge of the dial, so the sandblasted texture stays readable from an angle.' },
      movement: { title: 'Calibre F7H44', body: 'Automatic, with hand-winding and hacking. 24 jewels, 21,600 beats an hour, over 50 hours of reserve, and a rated accuracy of +15 to −5 seconds a day. The rotor and bridges are finished with Geneva stripes and chamfered edges.' },
      bezel: { title: 'Polished bezel and case', body: 'A stainless steel case, 39 mm across and 11.7 mm thick, with hairline and mirror finishes side by side.' },
      crown: { title: 'Conical crown', body: 'A tapered crown that is easy to grip when winding. Water resistance is 30 m, enough for splashes and rain.' },
      strap: { title: 'Leather strap, 20 mm', body: 'Leather on a deployant clasp with a push button, 20 mm at the lugs.' },
    },
    specs: [
      { label: 'Movement', value: 'Calibre F7H44, automatic with hand-winding and hacking' },
      { label: 'Power reserve', value: 'Over 50 hours' },
      { label: 'Accuracy', value: '+15 to −5 seconds a day' },
      { label: 'Beat rate', value: '21,600 beats an hour' },
      { label: 'Jewels', value: '24' },
      { label: 'Case', value: '39.0 mm, 11.7 mm thick, 45.7 mm lug to lug' },
      { label: 'Crystal', value: 'Dual-curve sapphire, anti-reflective coating' },
      { label: 'Water resistance', value: '30 m' },
      { label: 'Magnetic resistance', value: 'JIS Type 1 (4,800 A/m or more)' },
      { label: 'Complications', value: 'Small seconds, power reserve indicator' },
      { label: 'Lug width', value: '20 mm' },
      { label: 'Caseback', value: 'Sapphire exhibition' },
    ],
    stats: [
      { label: 'Case', value: '39 mm' },
      { label: 'Water resistance', value: '30 m' },
      { label: 'Power reserve', value: '50 h' },
    ],
  },
];
