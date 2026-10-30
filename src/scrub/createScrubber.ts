import { MEDIA, TIMELINE } from '../config';
import { isSafari } from '../lib/media';
import { FrameScrubber } from './FrameScrubber';
import { VideoScrubber } from './VideoScrubber';
import type { Scrubber } from './types';

export type { Scrubber } from './types';

export function createScrubber(clip: string, label: string): Scrubber {
  const opts = { clip, label, fps: MEDIA.fps, lerp: TIMELINE.lerp };
  // ?scrub=frames or ?scrub=video forces one implementation, handy for testing.
  const forced = new URLSearchParams(location.search).get('scrub');
  const setting = forced === 'frames' || forced === 'video' ? forced : MEDIA.scrubMode;
  const mode = setting === 'auto' ? (isSafari() ? 'frames' : 'video') : setting;
  return mode === 'frames' ? new FrameScrubber(opts) : new VideoScrubber(opts);
}
