import { drawWatch } from './watch-2d.js';

/**
 * Paints a whole watch (strap, case, dial, hands) onto a 2D canvas at a fixed time. Used for
 * collection cards and thumbnails. `time` is [hours, minutes, seconds]; 10:09 is the classic
 * product-shot position, with the hands framing the brand name.
 */
export function drawWatchFace(canvas, watch, variant, { size = 480, time = [10, 9, 36], zoom = 1 } = {}) {
  return drawWatch(canvas, watch, variant, { size, time, zoom });
}
