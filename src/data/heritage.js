/**
 * Heritage, craft and vocabulary content. Edit here; the Heritage and Craft pages render from it.
 *
 * Dates and facts come from Orient's own history timeline and from watch-press summaries
 * (sources at the bottom). Japanese era names are computed from the year:
 * Meiji 1 = 1868, Taishō 1 = 1912, Shōwa 1 = 1926, Heisei 1 = 1989, Reiwa 1 = 2019.
 */

export const HISTORY = [
  {
    year: 1901,
    era: '明治34年',
    title: 'Yoshida Watch Shop',
    body: 'On 4 March, Shogoro Yoshida opens a shop in Ueno, Tokyo. It imports and sells watches. Everything Orient became starts at this counter.',
  },
  {
    year: 1920,
    era: '大正9年',
    title: 'Toyo Tokei',
    body: 'The shop grows into a maker. Toyo Tokei builds table clocks and the gauges used in technical instruments. Tōyō (東洋) is the Japanese word for the Orient.',
  },
  {
    year: 1934,
    era: '昭和9年',
    title: 'The first wristwatches',
    body: 'Production at the Hino factory in Tokyo turns to wristwatches.',
  },
  {
    year: 1949,
    era: '昭和24年',
    title: 'War takes the factory',
    body: 'The war leaves the company badly damaged and the factory closes.',
  },
  {
    year: 1950,
    era: '昭和25年',
    title: 'Tama Keiki',
    body: 'On 13 July, former employees reopen the Hino factory as Tama Keiki. Wristwatch production restarts the same year. Orient counts this day as its founding.',
  },
  {
    year: 1951,
    era: '昭和26年',
    title: 'Orient Watch',
    body: 'The company takes the name Orient Watch Co. The first Orient Star goes on sale.',
  },
  {
    year: 1985,
    era: '昭和60年',
    title: 'Epson comes closer',
    body: 'Orient and Epson begin to pool resources, a partnership that would shape the next forty years.',
  },
  {
    year: 2001,
    era: '平成13年',
    title: 'Seiko Epson steps in',
    body: 'Seiko Epson becomes the majority shareholder, with 52 percent of the company.',
  },
  {
    year: 2009,
    era: '平成21年',
    title: 'A subsidiary',
    body: 'Orient becomes a wholly owned subsidiary of Seiko Epson. It stays a separate brand with its own movements.',
  },
  {
    year: 2016,
    era: '平成28年',
    title: 'The F6 family',
    body: 'A new line of in-house calibres, the F6 and F7, arrives with the Mako II and the Ray II.',
  },
  {
    year: 2017,
    era: '平成29年',
    title: 'Fully integrated',
    body: 'Orient is fully integrated into Seiko Epson.',
  },
  {
    year: 2025,
    era: '令和7年',
    title: 'Seventy-five years',
    body: 'Orient marks 75 years since 1950 with an anniversary diver on a sky-blue dial.',
  },
];

export const SOURCES = [
  { label: 'Orient Watch, history timeline', url: 'https://orient-watch.com/HistoryTimeline' },
  { label: 'Europa Star, the Orient story', url: 'https://www.europastar.com/1004114116.html' },
  { label: 'WatchTime, Orient Watch Company profile', url: 'https://www.watchtime.com/brands/orient-star/profile-Orient-Watch-Company' },
  { label: 'Two Broke Watch Snobs, origin of Orient watches', url: 'https://twobrokewatchsnobs.com/ep-188-all-about-orient-star-and-the-origin-of-orient-watches/' },
];

/** Japanese watch vocabulary. `part` links an entry to a watch part where one exists. */
export const GLOSSARY = [
  { jp: '機械式時計', ro: 'kikai-shiki tokei', en: 'Mechanical watch', note: 'Driven by a spring and a gear train, with no battery.' },
  { jp: '自動巻き', ro: 'jidō-maki', en: 'Self-winding', note: 'A weighted rotor winds the mainspring as your wrist moves.' },
  { jp: '手巻き', ro: 'te-maki', en: 'Hand-winding', note: 'Turn the crown to wind the spring yourself.' },
  { jp: '文字盤', ro: 'moji-ban', en: 'Dial', note: 'Literally the “letter plate”.' },
  { jp: '針', ro: 'hari', en: 'Hands', note: 'The same word as needle.' },
  { jp: '風防', ro: 'fūbō', en: 'Crystal', note: 'Literally “wind guard”.' },
  { jp: '竜頭', ro: 'ryūzu', en: 'Crown', note: 'Literally “dragon head”.' },
  { jp: '裏蓋', ro: 'ura-buta', en: 'Caseback', note: 'The “back lid”. Some Orients have a window in it.' },
  { jp: '防水', ro: 'bōsui', en: 'Water resistance', note: 'Rated in metres, 200 m on the divers.' },
  { jp: '夜光', ro: 'yakō', en: 'Lume', note: 'Glow in the dark. Literally “night light”.' },
];

/** The Japanese term shown beside each hotspot / anatomy entry. */
export const PART_TERMS = {
  crystal: { jp: '風防', ro: 'fūbō' },
  movement: { jp: '機械', ro: 'kikai' },
  bezel: { jp: 'ベゼル', ro: 'bezeru' },
  crown: { jp: '竜頭', ro: 'ryūzu' },
  strap: { jp: 'ベルト', ro: 'beruto' },
};

export const PART_LABELS = {
  crystal: 'Crystal',
  movement: 'Movement',
  bezel: 'Bezel',
  crown: 'Crown',
  strap: 'Strap',
};
