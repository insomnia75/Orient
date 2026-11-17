/**
 * Where the dial's sub-registers sit, as fractions of the dial radius. Shared by the dial painter,
 * the 3D hands and the 2D faces, so the hand always turns exactly on the printed sub-dial.
 * Pure data: no three.js, no DOM.
 */
export const SMALL_SECONDS = { y: 0.44, r: 0.2 }; // centre is below the dial centre (6 o'clock)
export const POWER_RESERVE = { y: -0.4, r: 0.2 }; // pivot is above the dial centre (12 o'clock)

export const hasSmallSeconds = (watch) => (watch.dial?.complications ?? []).includes('small-seconds');
export const hasPowerReserve = (watch) => (watch.dial?.complications ?? []).includes('power-reserve');
