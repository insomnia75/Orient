/**
 * Tunables for the 3D stage and hero. Everything you are likely to adjust while
 * dialling in the look lives here, so you never have to dig through scene code.
 *
 * Units: the watch is modelled in millimetres and the root group is scaled by MM,
 * so camera/target values below are in world units (1 unit = 20 mm).
 */
export const MM = 0.05;

export const STAGE = {
  fov: 28,
  exposure: 1.05,
  envIntensity: 0.9,
  maxDpr: 1.75,
  keyLight: 2.1,
  rimLight: 1.1,
  /** Intensity of the point light that follows the cursor over the watch. */
  cursorLight: 14,
  /** Share of the stage width the watch is pushed right, to clear the info panel (desktop only). */
  desktopShift: 0.12,
  minDistance: 2.2,
  maxDistance: 12,
};

export const HERO = {
  fov: 32,
  cameraZ: 16,
  exposure: 1,
  envIntensity: 0.6,
  cursorLight: 24,
  particles: 70,
  /** Upper pixel-ratio bound. The scene is a soft background, so it never needs a retina buffer. */
  maxDpr: 1.5,
  /** Mainspring-barrel speed in radians per second. Every other wheel follows from the tooth counts;
   *  keep it low (the escape wheel turns about 45x faster) or fine teeth start to shimmer. */
  speed: 0.018,
};

/** Accent used before the first watch is selected. */
export const DEFAULT_ACCENT = '#e9dcb0';
