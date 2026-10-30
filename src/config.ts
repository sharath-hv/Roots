// Everything you are likely to change lives here: brand, money, media, timing.
import mediaConfig from '../media.config.json';

export const BRAND = {
  name: 'Roots',
  tagline: 'Organic fruit and flowers, picked to order.',
  place: 'Nandi Hills, Karnataka',
  email: 'hello@roots.example',
};

export const CURRENCY = {
  code: 'INR',
  locale: 'en-IN',
  // Prices in products.ts are in whole units of this currency.
  format(amount: number) {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: this.code,
      maximumFractionDigits: 0,
    }).format(amount);
  },
};

// Encoded files come out of `npm run media` as <clip>-<width>.mp4 and
// <still>-<width>.jpg. We pick a width once per visit from the viewport.
export const MEDIA = {
  base: '/media',
  widths: mediaConfig.widths as number[],
  /** 'video' = blob-backed <video>; 'frames' = canvas WebP sequence; 'auto' = frames on Safari, video elsewhere. */
  scrubMode: 'auto' as 'auto' | 'video' | 'frames',
  fps: 24,
  clips: {
    walkIn: { name: 'walk-in', first: 'walk-in-start', last: 'hut-closed' },
    hutOpen: { name: 'hut-open', first: 'hut-approach', last: 'interior' },
  },
  // Horizontal focus point (0 = left, 1 = right) used by object-position on
  // portrait screens, so the path and the hut stay in frame.
  portraitFocusX: { walkIn: 0.5, hutOpen: 0.55 },
  // TODO(watermark): the source stills/videos may carry an AI watermark in the
  // bottom-right corner. Crops are applied at encode time from media.config.json;
  // set them to null once you have clean sources. No UI is placed in this zone.
  watermarkCrop: Object.fromEntries(
    Object.entries(mediaConfig.clips).map(([k, v]) => [k, v.crop]),
  ),
  watermarkSafeZone: { right: 0.12, bottom: 0.12 },
};

// Scroll lengths, in vh of scroll. Video segments use one constant ratio so
// speed feels the same in both parts.
export const TIMELINE = {
  vhPerSecond: 80,
  walkInSeconds: 5,
  hutOpenSeconds: 6,
  holdVh: 35, // beat on the last frame of each clip
  foldVh: 360, // three lines one after another, each held long enough to read
  dissolveVh: 90, // meadow pushes through to the hut approach
  stallVh: 110, // stall is shoppable while pinned
  doorsAjarSeconds: 1.9, // after the last fold line, auto-scroll to this moment of the hut clip
  lerp: 0.12,
};

export const STORAGE_KEYS = {
  cart: 'farmlife.cart.v1',
  sound: 'farmlife.sound.v1',
};
